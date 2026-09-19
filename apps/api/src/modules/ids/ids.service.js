import sql from '../../config/database.js'
import { STAFF_CODE_PREFIX } from '../user/user.repository.js'
import { normalizePhone } from '../../utils/phone.js'
import { toObjectIdString } from '../../utils/registration.js'
import logger from '../../utils/logger.js'

const pad = (n, len) => String(n).padStart(len, '0')

/** Atomic next-value for a named sequence using Postgres counters table. */
async function nextSequence(key) {
  const [row] = await sql`
    INSERT INTO counters (key, seq) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET seq = counters.seq + 1
    RETURNING seq
  `
  return Number(row.seq)
}

function yyyymmdd(d = new Date()) {
  const dt = new Date(d)
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1, 2)}${pad(dt.getDate(), 2)}`
}

function ddmmyyyy(d = new Date()) {
  const dt = new Date(d)
  return `${pad(dt.getDate(), 2)}${pad(dt.getMonth() + 1, 2)}${dt.getFullYear()}`
}

function mmyyyy(d = new Date()) {
  const dt = new Date(d)
  return `${pad(dt.getMonth() + 1, 2)}${dt.getFullYear()}`
}

class IdsService {
  /** For tests/seeding without DB races — pure format helpers. */
  formats = {
    uhid: (mmyyyyStamp, seq) => `KGN-${mmyyyyStamp}-${pad(seq, 5)}`,
    token: (typeLabel, ddmmyyyyStamp, seq) => `T-${typeLabel}-${ddmmyyyyStamp}-${pad(seq, 3)}`,
    booking: (yyyymmddStr, seq) => `BK-${yyyymmddStr}-${pad(seq, 3)}`,
    medOrder: (yyyymm, seq) => `MED-${yyyymm}-${pad(seq, 3)}`,
    staffCode: (role, seq) => `${STAFF_CODE_PREFIX[role]}${pad(seq, 3)}`,
  }

  /**
   * One UHID per phone number + patient name combination.
   * Reuses the UHID already held by any patient record with this phone and name;
   * mints a new one from the global running series when none exists.
   */
  async ensureUhidForPhone(rawPhone, rawName = '') {
    const phone = normalizePhone(rawPhone)
    const name = String(rawName || '').trim()

    let rows
    if (name) {
      rows = await sql`
        SELECT uhid FROM patients
        WHERE phone = ${phone} AND LOWER(name) = ${name.toLowerCase()} AND uhid IS NOT NULL
        LIMIT 1
      `
    } else {
      rows = await sql`
        SELECT uhid FROM patients
        WHERE phone = ${phone} AND uhid IS NOT NULL
        LIMIT 1
      `
    }

    if (rows.length > 0 && rows[0].uhid) {
      return String(rows[0].uhid)
    }

    // Global running sequence
    const seq = await nextSequence('uhid:seq')
    const uhid = this.formats.uhid(mmyyyy(), seq)
    logger.info(`Generated UHID ${uhid} for ${name || 'patient'} (${phone})`)
    return uhid
  }

  /** Mint the next UHID in the global series. */
  async generateUhidDirect(date = new Date()) {
    const seq = await nextSequence('uhid:seq')
    return this.formats.uhid(mmyyyy(date), seq)
  }

  /**
   * Daily sequential token per visit type: T-OPD-DDMMYYYY-001 / T-IPD-DDMMYYYY-001.
   * Computes sequence from MAX existing token number for the doctor and date to avoid
   * gaps, backwards jumping, or duplicates. Starts at 001 for a fresh date/doctor.
   */
  async generateToken(type, doctorId, date = new Date()) {
    const label = type === 'HOSPITALIZATION' ? 'IPD' : 'OPD'
    const docKey = doctorId ? String(doctorId) : 'general'
    const stamp = ddmmyyyy(date)
    const dt = new Date(date)
    const dateStr = isNaN(dt.getTime()) ? new Date().toISOString().slice(0, 10) : dt.toISOString().slice(0, 10)

    let seq
    const coercedDoctorId = toObjectIdString(doctorId)
    if (coercedDoctorId) {
      try {
        const [row] = await sql`
          SELECT COALESCE(
            MAX(
              CASE
                WHEN token_number ~ '(\\d+)$' THEN CAST(SUBSTRING(token_number FROM '(\\d+)$') AS INTEGER)
                ELSE 0
              END
            ),
            0
          ) AS max_seq
          FROM bookings
          WHERE doctor_id = ${coercedDoctorId}
            AND appointment_date::date = ${dateStr}::date
        `
        const maxSeq = Number(row?.max_seq || 0)
        seq = maxSeq + 1

        const key = `token:${label}:${docKey}:${stamp}`
        await sql`
          INSERT INTO counters (key, seq) VALUES (${key}, ${seq})
          ON CONFLICT (key) DO UPDATE SET seq = ${seq}
        `
      } catch (e) {
        seq = await nextSequence(`token:${label}:${docKey}:${stamp}`)
      }
    } else {
      seq = await nextSequence(`token:${label}:${docKey}:${stamp}`)
    }

    return this.formats.token(label, stamp, seq)
  }

  /** Booking series — BK-YYYYMMDD-NNN format. */
  async generateBookingId(date = new Date()) {
    const stamp = yyyymmdd(date)
    const seq = await nextSequence(`booking:${stamp}`)
    return this.formats.booking(stamp, seq)
  }

  /** Medicine order series — MED-YYYYMM-NNN format. */
  async generateMedOrderId(date = new Date()) {
    const dt = new Date(date)
    const stamp = `${dt.getFullYear()}${pad(dt.getMonth() + 1, 2)}`
    const seq = await nextSequence(`medorder:${stamp}`)
    return this.formats.medOrder(stamp, seq)
  }

  /** Role-prefixed staff code, e.g. KGN_RC_001. */
  async generateStaffCode(role) {
    if (!STAFF_CODE_PREFIX[role]) throw new Error(`Unknown role for staff code: ${role}`)
    const seq = await nextSequence(`staffcode:${role}`)
    return this.formats.staffCode(role, seq)
  }
}

export default new IdsService()
