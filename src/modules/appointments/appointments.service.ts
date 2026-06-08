import { AppointmentStatus, ConsultationType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errors/AppError.js";
import httpStatus from "http-status";
import {
  generateTransactionId,
  initiateSSLCommerzPayment,
  validateSSLCommerzPayment,
} from "./sslcommerz.helper.js";
import { config } from "../../config/index.js";
import { createGoogleMeet } from "../../helpers/generateMeetLink.js";
import { sendEmail } from "../../helpers/sendEmail.js";

// ─────────────────────────────────────────────────────────────────────────────
// CREATE APPOINTMENT  →  initiate payment
// ─────────────────────────────────────────────────────────────────────────────
const createAppointment = async (
  userId: number,
  payload: {
    doctorId: number;
    slotId: number;
    patientId?: number;
    patientName: string;
    relation: string;
    gender?: string;
    dateOfBirth?: string;
    consultationType: ConsultationType;
    appointmentDate: string;
    notes?: string;
  },
) => {
  const {
    doctorId,
    slotId,
    patientId: _patientId,
    patientName,
    relation,
    gender,
    dateOfBirth,
    consultationType,
    appointmentDate,
    notes,
  } = payload;

  // 1. Check slot availability
  const slot = await prisma.doctorSlot.findUnique({
    where: { id: slotId },
    include: { doctor: { include: { user: true } } },
  });

  const patient = await prisma.patient.findUnique({
    where: { userId },
  });

  if (!patient) {
    throw new AppError("Patient profile not found", httpStatus.NOT_FOUND);
  }

  const patientId = patient.id;

  // 2. Check if same patient already has a PENDING/BOOKED appointment with this doctor on same date
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      patientId,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentStatus: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  // 3. Fetch patient & user for payment form
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", httpStatus.NOT_FOUND);

  // 4. Fetch doctor's consultation fee
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { consultationFee: true, user: { select: { name: true, email: true } } },
  });
  if (!doctor) throw new AppError("Doctor not found", httpStatus.NOT_FOUND);

  if (existingAppointment) {
    const payment = await prisma.payment.findFirst({
      where: {
        appointmentId: existingAppointment.id,
        paymentStatus: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    if (payment) {
      const tran_id = generateTransactionId(existingAppointment.publicId);
      const sslPayload = {
        total_amount: doctor.consultationFee,
        currency: "BDT",
        tran_id,
        success_url: `${config.serverUrl}/api/v1/appointment/payment/success?tran_id=${tran_id}&appointmentId=${existingAppointment.publicId}`,
        fail_url: `${config.serverUrl}/api/v1/appointment/payment/fail?tran_id=${tran_id}&appointmentId=${existingAppointment.publicId}`,
        cancel_url: `${config.serverUrl}/api/v1/appointment/payment/cancel?tran_id=${tran_id}&appointmentId=${existingAppointment.publicId}`,
        ipn_url: `${config.serverUrl}/api/v1/appointment/payment/ipn`,
        cus_name: user.name,
        cus_email: user.email,
        cus_phone: user.phone || "01700000000",
        product_name: "Doctor Appointment",
        product_category: "Healthcare",
        product_profile: "general",
        shipping_method: "NO",
        num_of_item: 1,
      };

      const sslResponse = await initiateSSLCommerzPayment({
        ...sslPayload,
        tran_id,
      });

      await prisma.payment.update({
        where: { appointmentId: existingAppointment.id },
        data: {
          gateway: "SSLCOMMERZ",
          transactionId: tran_id,
          paymentStatus: "PENDING",
        },
      });

      return {
        appointment: existingAppointment,
        paymentUrl: sslResponse.GatewayPageURL,
        isExistingAppointment: true,
      };
    }

    throw new AppError(
      "Patient already has an active appointment with this doctor on this date",
      httpStatus.CONFLICT,
    );
  }

  if (!slot) throw new AppError("Slot not found", httpStatus.NOT_FOUND);
  if (slot.isBooked || slot.isCancelled) throw new AppError("Slot is not available", httpStatus.CONFLICT);
  if (slot.doctorId !== doctorId)
    throw new AppError("Slot does not belong to this doctor", httpStatus.BAD_REQUEST);

  // 5. Create appointment + mark slot as booked (transaction)

  const appointment = await prisma.$transaction(async (tx) => {
    // Create appointment
    const appt = await tx.appointment.create({
      data: {
        doctorId,
        patientId,
        userId,
        patientName,
        relation,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        consultationType,
        appointmentDate: new Date(appointmentDate),
        notes,
        appointmentStatus: "PENDING",
        doctorSlots: { connect: { id: slotId } },
      },
    });

    // Mark slot as booked (pending confirmation until payment)
    await tx.doctorSlot.update({
      where: { id: slotId },
      data: { isBooked: true, appointmentId: appt.id },
    });

    return appt;
  });

  // 6. Initiate SSLCommerz payment
  const tran_id = generateTransactionId(appointment.publicId);
  const sslPayload = {
    total_amount: doctor.consultationFee,
    currency: "BDT",
    tran_id,
    success_url: `${config.serverUrl}/api/v1/appointment/payment/success?tran_id=${tran_id}&appointmentId=${appointment.publicId}`,
    fail_url: `${config.serverUrl}/api/v1/appointment/payment/fail?tran_id=${tran_id}&appointmentId=${appointment.publicId}`,
    cancel_url: `${config.serverUrl}/api/v1/appointment/payment/cancel?tran_id=${tran_id}&appointmentId=${appointment.publicId}`,
    ipn_url: `${config.serverUrl}/api/v1/appointment/payment/ipn`,
    cus_name: user.name,
    cus_email: user.email,
    cus_phone: user.phone || "01700000000",
    product_name: "Doctor Appointment",
    product_category: "Healthcare",
    product_profile: "general",
    shipping_method: "NO",
    num_of_item: 1,
  };

  const sslResponse = await initiateSSLCommerzPayment(sslPayload);

  // 7. Create pending payment record
  await prisma.payment.create({
    data: {
      appointmentId: appointment.id,
      amount: doctor.consultationFee,
      gateway: "SSLCOMMERZ",
      transactionId: tran_id,
      paymentStatus: "PENDING",
    },
  });

  return {
    appointment,
    paymentUrl: sslResponse.GatewayPageURL,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SUCCESS  (called by SSLCommerz redirect + IPN)
// ─────────────────────────────────────────────────────────────────────────────
const handlePaymentSuccess = async (tran_id: string, val_id: string, appointmentPublicId: string) => {
  // Validate payment with SSLCommerz only when a val_id is available.
  // The browser redirect may not include it, so IPN or the validation API is the reliable source.
  if (val_id) {
    const validationResult = await validateSSLCommerzPayment(val_id);

    if (validationResult.status !== "VALID" && validationResult.status !== "VALIDATED") {
      throw new AppError("Payment validation failed", httpStatus.BAD_REQUEST);
    }
  }

  const appointment = await prisma.appointment.findUnique({
    where: { publicId: appointmentPublicId },
    include: {
      user: true,
      doctor: { include: { user: true } },
      doctorSlots: true,
    },
  });

  if (!appointment) throw new AppError("Appointment not found", httpStatus.NOT_FOUND);

  if (appointment.appointmentStatus === "CONFIRMED") {
    return appointment; // already processed (IPN duplicate)
  }

  const payment = await prisma.payment.findUnique({ where: { transactionId: tran_id } });
  if (!payment) throw new AppError("Payment record not found", httpStatus.NOT_FOUND);

  await prisma.$transaction(async (tx) => {
    // Update payment status
    await tx.payment.update({
      where: { transactionId: tran_id },
      data: { paymentStatus: "SUCCESS" },
    });

    // Update appointment status
    await tx.appointment.update({
      where: { publicId: appointmentPublicId },
      data: { appointmentStatus: "CONFIRMED" },
    });

    // Fetch current user balance
    const userRecord = await tx.user.findUnique({ where: { id: appointment.userId } });
    // const previousBalance = userRecord?.walletBalance ?? 0;

    // Create transaction log
    await tx.transaction.create({
      data: {
        userId: appointment.userId,
        appointmentId: appointment.id,
        paymentId: payment.id,
        type: "APPOINTMENT_PAYMENT",
        status: "SUCCESS",
        amount: payment.amount,
        previousBalance: 0,
        currentBalance: 0,
        note: `Payment for appointment #${appointment.publicId}`,
      },
    });

    // Create meeting link for online consultations
    if (appointment.consultationType === "ONLINE") {
      try {
        console.log(appointment);
        console.log(
          String(appointment?.doctorSlots?.startTime.toISOString()),
          String(appointment?.doctorSlots?.endTime.toISOString()),
        );
        const { meetLink, eventId } = await createGoogleMeet(
          String(appointment?.doctorSlots?.startTime.toISOString()),
          String(appointment?.doctorSlots?.endTime.toISOString()),
          [{ email: "nazmul@gmail.com" }],
        );

        await tx.meeting.create({
          data: {
            appointmentId: appointment.id,
            meetingLink: meetLink || "",
            eventId: eventId,
            meetingTime: appointment.appointmentDate,
          },
        });
      } catch (error: any) {
        console.log(error.response.data.error);
        throw new Error(error);
      }
    }
  });

  // Send confirmation emails
  await Promise.allSettled([
    sendEmail({
      to: appointment.user.email,
      subject: "Appointment Confirmed ✅",
      template: "appointmentConfirmed",
      data: {
        patientName: appointment.patientName,
        doctorName: appointment.doctor.user.name,
        appointmentDate: String(appointment.appointmentDate),
        consultationType: appointment.consultationType,
      },
    }),
    sendEmail({
      to: appointment.doctor.user.email,
      subject: "New Appointment Booked",
      template: "newAppointmentDoctor",
      data: {
        patientName: appointment.patientName,
        appointmentDate: String(appointment.appointmentDate),
      },
    }),
  ]);

  return appointment;
};

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT FAIL / CANCEL
// ─────────────────────────────────────────────────────────────────────────────
const handlePaymentFail = async (tran_id: string, appointmentPublicId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { publicId: appointmentPublicId },
    include: { doctorSlots: true, user: true },
  });

  if (!appointment) throw new AppError("Appointment not found", httpStatus.NOT_FOUND);

  const payment = await prisma.payment.findUnique({ where: { transactionId: tran_id } });

  await prisma.$transaction(async (tx) => {
    // Update payment to FAILED
    if (payment) {
      await tx.payment.update({
        where: { transactionId: tran_id },
        data: { paymentStatus: "FAILED" },
      });
    }

    // Cancel appointment
    await tx.appointment.update({
      where: { publicId: appointmentPublicId },
      data: { appointmentStatus: "CANCELLED" },
    });

    // Release slots

    await tx.doctorSlot.update({
      where: { id: appointment?.doctorSlots?.id },
      data: { isBooked: false, appointmentId: null },
    });

    // Create failed transaction log
    const userRecord = await tx.user.findUnique({ where: { id: appointment.userId } });
    // const previousBalance = userRecord?.walletBalance ?? 0;

    await tx.transaction.create({
      data: {
        userId: appointment.userId,
        appointmentId: appointment.id,
        paymentId: payment?.id,
        type: "APPOINTMENT_PAYMENT",
        status: "FAILED",
        amount: payment?.amount ?? 0,
        previousBalance: 0,
        currentBalance: 0,
        note: `Failed payment for appointment #${appointment.publicId}`,
      },
    });
  });

  // Notify patient
  await sendEmail({
    to: appointment.user.email,
    subject: "Appointment Payment Failed",
    template: "appointmentPaymentFailed",
    data: { patientName: appointment.patientName },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// IPN (Instant Payment Notification from SSLCommerz)
// ─────────────────────────────────────────────────────────────────────────────
const handleIPN = async (ipnData: Record<string, string>) => {
  const { tran_id, val_id, status } = ipnData;

  const payment = await prisma.payment.findUnique({ where: { transactionId: tran_id } });
  if (!payment || payment.paymentStatus === "SUCCESS") return; // already handled

  const appointment = await prisma.appointment.findUnique({
    where: { id: payment.appointmentId },
  });
  if (!appointment) return;

  if (status === "VALID" || status === "VALIDATED") {
    await handlePaymentSuccess(tran_id, val_id, appointment.publicId);
  } else if (status === "FAILED") {
    await handlePaymentFail(tran_id, appointment.publicId);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESCHEDULE APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────
const rescheduleAppointment = async (
  publicId: string,
  payload: { newSlotId: number; newAppointmentDate: string },
) => {
  const { newSlotId, newAppointmentDate } = payload;

  const appointment = await prisma.appointment.findUnique({
    where: { publicId },
    include: { doctorSlots: true, user: true, doctor: { include: { user: true } } },
  });

  if (!appointment) throw new AppError("Appointment not found", httpStatus.NOT_FOUND);

  if (!["CONFIRMED", "PENDING"].includes(appointment.appointmentStatus))
    throw new AppError("Only PENDING or CONFIRMED appointments can be rescheduled", httpStatus.BAD_REQUEST);

  // Validate new slot
  const newSlot = await prisma.doctorSlot.findUnique({ where: { id: newSlotId } });
  if (!newSlot) throw new AppError("Slot not found", httpStatus.NOT_FOUND);
  if (newSlot.isBooked || newSlot.isCancelled)
    throw new AppError("New slot is not available", httpStatus.CONFLICT);
  if (newSlot.doctorId !== appointment.doctorId)
    throw new AppError("Slot does not belong to the same doctor", httpStatus.BAD_REQUEST);

  await prisma.$transaction(async (tx) => {
    // Release old slots

    await tx.doctorSlot.update({
      where: { id: appointment?.doctorSlots?.id },
      data: { isBooked: false, appointmentId: null },
    });

    // Book new slot
    await tx.doctorSlot.update({
      where: { id: newSlotId },
      data: { isBooked: true, appointmentId: appointment.id },
    });

    // Update appointment
    await tx.appointment.update({
      where: { publicId },
      data: {
        appointmentDate: new Date(newAppointmentDate),
        doctorSlots: {
          connect: {
            id: newSlotId,
          },
        },
      },
    });

    // Update meeting time if exists
    await tx.meeting.updateMany({
      where: { appointmentId: appointment.id },
      data: { meetingTime: new Date(newAppointmentDate) },
    });
  });

  // Notify patient & doctor
  await Promise.allSettled([
    sendEmail({
      to: appointment.user.email,
      subject: "Appointment Rescheduled",
      template: "appointmentRescheduled",
      data: {
        patientName: appointment.patientName,
        newDate: newAppointmentDate,
        doctorName: appointment.doctor.user.name,
      },
    }),
    sendEmail({
      to: appointment.doctor.user.email,
      subject: "Appointment Rescheduled by Patient",
      template: "appointmentRescheduledDoctor",
      data: {
        patientName: appointment.patientName,
        newDate: newAppointmentDate,
      },
    }),
  ]);

  return prisma.appointment.findUnique({
    where: { publicId },
    include: { doctorSlots: true, meeting: true, payment: true },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE APPOINTMENT STATUS  (admin/doctor)
// ─────────────────────────────────────────────────────────────────────────────
const updateAppointmentStatus = async (publicId: string, appointmentStatus: AppointmentStatus) => {
  const appointment = await prisma.appointment.findUnique({ where: { publicId } });
  if (!appointment) throw new AppError("Appointment not found", httpStatus.NOT_FOUND);

  return prisma.appointment.update({
    where: { publicId },
    data: { appointmentStatus },
    include: { payment: true, meeting: true },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY APPOINTMENTS (patient)
// ─────────────────────────────────────────────────────────────────────────────
const getMyAppointments = async (
  userId: number,
  role: string,
  filters: { status?: AppointmentStatus; page?: number; limit?: number },
) => {
  const { status, page = 1, limit = 10 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.AppointmentWhereInput = {};
  if (role === "DOCTOR") {
    const doctor = await prisma.doctor.findUniqueOrThrow({ where: { userId: userId } });
    where.doctorId = doctor?.id;
  }
  if (role === "PATIENT") {
    where.userId = userId;
  }

  if (status) where.appointmentStatus = status;

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        doctor: { include: { user: { select: { name: true, email: true } } } },
        payment: true,
        meeting: true,
        doctorSlots: true,
      },
      orderBy: { appointmentDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    appointments,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────
const getAppointmentByPublicId = async (publicId: string, userId: number, role: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { publicId },
    include: {
      doctor: { include: { user: { select: { name: true, email: true } } } },
      patient: true,
      payment: true,
      meeting: true,
      doctorSlots: true,
      prescription: true,
    },
  });

  if (!appointment) throw new AppError("Appointment not found", httpStatus.NOT_FOUND);
  if (appointment.userId !== userId && role === "PATIENT")
    throw new AppError("Unauthorized", httpStatus.FORBIDDEN);
  if (role === "DOCTOR") {
    const doctor = await prisma.doctor.findFirstOrThrow({ where: { userId } });
    if (doctor.id !== appointment.doctorId) throw new AppError("Unauthorized", httpStatus.FORBIDDEN);
  }

  return appointment;
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────
const cancelAppointment = async (publicId: string, userId: number) => {
  const appointment = await prisma.appointment.findUnique({
    where: { publicId },
    include: { doctorSlots: true, payment: true, user: true, doctor: { include: { user: true } } },
  });

  if (!appointment) throw new AppError("Appointment not found", httpStatus.NOT_FOUND);
  if (appointment.userId !== userId) throw new AppError("Unauthorized", httpStatus.FORBIDDEN);
  if (!["PENDING"].includes(appointment.appointmentStatus))
    throw new AppError("Appointment cannot be cancelled", httpStatus.BAD_REQUEST);

  await prisma.$transaction(async (tx) => {
    // Release slots

    await tx.doctorSlot.update({
      where: { id: appointment.doctorSlots?.id },
      data: { isBooked: false, appointmentId: null },
    });

    // Cancel appointment
    await tx.appointment.update({
      where: { publicId },
      data: { appointmentStatus: "CANCELLED" },
    });

    // If payment was completed, initiate refund transaction log
    if (appointment.payment?.paymentStatus === "SUCCESS") {
      const userRecord = await tx.user.findUnique({ where: { id: userId } });
      // const previousBalance = userRecord?.walletBalance ?? 0;

      await tx.transaction.create({
        data: {
          userId,
          appointmentId: appointment.id,
          paymentId: appointment.payment.id,
          type: "REFUND",
          status: "PENDING",
          amount: appointment.payment.amount,
          previousBalance: 0,
          currentBalance: 0,
          note: `Refund for cancelled appointment #${publicId}`,
        },
      });

      await tx.payment.update({
        where: { id: appointment.payment.id },
        data: { paymentStatus: "REFUNDED" },
      });
    }
  });

  await sendEmail({
    to: appointment.user.email,
    subject: "Appointment Cancelled",
    template: "appointmentCancelled",
    data: { patientName: appointment.patientName },
  });
};

export const appointmentService = {
  createAppointment,
  handlePaymentSuccess,
  handlePaymentFail,
  handleIPN,
  rescheduleAppointment,
  updateAppointmentStatus,
  getMyAppointments,
  getAppointmentByPublicId,
  cancelAppointment,
};
