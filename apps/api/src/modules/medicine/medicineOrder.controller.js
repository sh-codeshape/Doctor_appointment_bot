import medOrderRepo from "./medicineOrder.repository.js";
import bookingRepo from "../booking/booking.repository.js";
import conversationService from "../conversation/conversation.service.js";
import { uploadPrescriptionImage } from "../../utils/cloudinary.js";
import logger from "../../utils/logger.js";

class MedicineOrderController {
  async getOrders(req, res) {
    const { page = 1, limit = 10, status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.search = search;

    if (req.admin?.role === "doctor") {
      if (!req.admin.doctorId) {
        return res.status(403).json({
          success: false,
          message: "No doctor profile linked to this login",
        });
      }
      filter.patientIds = await bookingRepo.findDistinctPatientIdsByDoctor(
        req.admin.doctorId,
      );
    }

    const result = await medOrderRepo.findAll(filter, { page, limit });
    res.json(result);
  }

  async updateStatus(req, res) {
    if (req.admin?.role === "receptionist") {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: receptionists have read-only access to medicine orders",
      });
    }
    const { id } = req.params;
    const { status, staffNotes, phone, mobile } = req.body;

    if (status === 'pending') {
      const existing = await medOrderRepo.findById(id);
      if (existing && existing.status === 'cancelled') {
        const role = req.admin?.role?.toLowerCase();
        if (req.admin && role && role !== 'admin' && role !== 'superadmin' && role !== 'super') {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: Only admin can reopen cancelled medicine orders',
          });
        }
      }
    }

    const order = await medOrderRepo.updateStatus(id, { status, staffNotes });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const targetPhone = phone || mobile || order.patientId?.phone;
    if (targetPhone) {
      try {
        let msg = "";
        const orderNum = order.orderId || `MED-${order.id}`;
        const notes = staffNotes || order.staffNotes;

        if (status === "processing") {
          msg =
            `✅ *Medicine Order Confirmed / ऑर्डर स्वीकृत*\n\n` +
            `Your medicine order (*${orderNum}*) is now being processed.\n` +
            `आपका दवा ऑर्डर (*${orderNum}*) स्वीकृत कर लिया गया है और प्रोसेस किया जा रहा है।\n\n` +
            (notes ? `📌 *Pharmacy Note:* ${notes}\n\n` : "") +
            `📞 For any queries, contact : 98838850287 KG Nanda Hospital.`;
        } else if (status === "dispatched") {
          msg =
            `🚚 *Medicine Order Dispatched / दवा रवाना कर दी गई है*\n\n` +
            `Your medicine order (*${orderNum}*) has been dispatched for delivery.\n` +
            `आपका दवा ऑर्डर (*${orderNum}*) डिलीवरी के लिए रवाना कर दिया गया है।\n\n` +
            (order.deliveryAddress
              ? `🏠 *Delivery Address:* ${order.deliveryAddress}\n`
              : "") +
            (notes ? `📌 *Pharmacy Note:* ${notes}\n\n` : "") +
            `📞 For any queries, contac: 98838850287 KG Nanda Hospital.`;
        } else if (status === "completed") {
          msg =
            `🎉 *Medicine Order Delivered / दवा डिलीवर कर दी गई है*\n\n` +
            `Your medicine order (*${orderNum}*) has been successfully delivered.\n` +
            `आपका दवा ऑर्डर (*${orderNum}*) सफलतापूर्वक डिलीवर कर दिया गया है।\n\n` +
            `Thank you for choosing KG Nanda Hospital! 🙏`;
        } else if (status === "cancelled") {
          msg =
            `❌ *Medicine Order Cancelled / दवा का ऑर्डर रद्द कर दिया गया*\n\n` +
            `Your medicine order (*${orderNum}*) has been cancelled.\n` +
            `आपका दवा ऑर्डर (*${orderNum}*) रद्द कर दिया गया है।\n\n` +
            (notes ? `📌 *Reason:* ${notes}\n\n` : "") +
            `📞 For assistance, contact 9838850287 KG Nanda Hospital.`;
        } else if (status === "pending") {
          msg =
            `ℹ️ *Medicine Order Reopened / ऑर्डर पुनः चालू किया गया*\n\n` +
            `Your medicine order (*${orderNum}*) has been reopened and reset to pending status.\n` +
            `आपका दवा ऑर्डर (*${orderNum}*) पुनः पेंडिंग स्थिति में कर दिया गया है।\n\n` +
            (notes ? `📌 *Note:* ${notes}\n\n` : "") +
            `📞 For any queries, contact 9838850287 KG Nanda Hospital.`;
        }

        if (msg) {
          await conversationService.sendMessage(targetPhone, msg);
        }
      } catch (err) {
        logger.error(
          `Failed to send status update notification for medicine order ${id}:`,
          err,
        );
      }
    }

    res.json(order);
  }

  async uploadPrescription(req, res) {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res
        .status(400)
        .json({ success: false, message: "imageBase64 parameter is required" });
    }
    const secureUrl = await uploadPrescriptionImage(imageBase64, { filename });
    res.json({ success: true, url: secureUrl });
  }
}

export default new MedicineOrderController();
