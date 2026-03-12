import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId, requireId } from '../id-map';

/**
 * Step 04: Migrate appointments.
 *
 * MySQL fields: id, title, description, date (datetime), duration (int minutes),
 *   event_id (Google Calendar), patient_id, user_id, timestamps
 *
 * PG fields: startDatetime, endDatetime, durationMinutes, status, googleCalendarEventId
 */
export async function runAppointments(): Promise<void> {
  const prisma = getPrisma();

  const mysqlAppointments = await query<{
    id: number;
    title: string | null;
    description: string | null;
    date: Date;
    duration: number | null;
    event_id: string | null;
    patient_id: number;
    user_id: number | string;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM appointments');

  let skipped = 0;

  for (const a of mysqlAppointments) {
    const uuid = mapId('appointments', a.id);

    let patientId: string;
    let doctorId: string;
    try {
      patientId = requireId('patients', a.patient_id);
      doctorId = requireId('users', a.user_id);
    } catch {
      skipped++;
      console.warn(`  Warning: Skipping appointment ${a.id} - missing patient or user reference`);
      continue;
    }

    const startDatetime = new Date(a.date);
    const durationMinutes = a.duration || 60;
    const endDatetime = new Date(startDatetime.getTime() + durationMinutes * 60 * 1000);

    await prisma.appointment.create({
      data: {
        id: uuid,
        patientId,
        doctorId,
        title: a.title || null,
        description: a.description || null,
        startDatetime,
        endDatetime,
        durationMinutes,
        status: 'completed', // Legacy appointments are all considered completed
        googleCalendarEventId: a.event_id || null,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      },
    });
  }

  console.log(`  Migrated ${mysqlAppointments.length - skipped} appointments (${skipped} skipped)`);
}
