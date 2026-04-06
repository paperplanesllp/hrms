import cron from "node-cron";
import { Event, EVENT_PURPOSE } from "../modules/calendar/Event.model.js";
import { User } from "../modules/users/User.model.js";
import { sendNotification } from "../utils/notifications.js";
import { ROLES } from "../middleware/roles.js";

let schedulerActive = false;

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseEventDateTime = (dateString, timeString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hours, minutes] = timeString.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const buildReminderMessage = (event, window) => {
  if (event.purpose === EVENT_PURPOSE.PUBLIC_HOLIDAY) {
    return {
      title: `Today is ${event.title}`,
      message: `${event.title} is observed today as a public holiday.`
    };
  }

  if (window === "24h") {
    return {
      title: `Tomorrow: ${event.title}`,
      message: `${event.title} starts tomorrow at ${event.startTime}. Prepare ahead of time.`
    };
  }

  return {
    title: `Upcoming event: ${event.title}`,
    message: `${event.title} starts at ${event.startTime} today. Don’t miss it.`
  };
};

export function initializeEventScheduler() {
  if (schedulerActive) {
    console.log("⏭️ Event scheduler already running");
    return;
  }

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const today = getLocalDateString(now);
      const tomorrow = getLocalDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));

      // Automatically mark past events as completed so they no longer appear as upcoming
      await Event.updateMany(
        {
          status: "ACTIVE",
          date: { $lt: today }
        },
        { status: "COMPLETED" }
      );

      const events = await Event.find({
        status: "ACTIVE",
        $or: [
          { date: today, purpose: EVENT_PURPOSE.PUBLIC_HOLIDAY, reminderSent: false },
          { date: today, reminder1hSent: false, startTime: { $exists: true, $ne: "" }, purpose: { $in: [EVENT_PURPOSE.MEETING, EVENT_PURPOSE.REMINDER] } },
          { date: tomorrow, reminder24hSent: false, startTime: { $exists: true, $ne: "" }, purpose: { $in: [EVENT_PURPOSE.MEETING, EVENT_PURPOSE.REMINDER] } }
        ]
      });

      if (!events.length) return;

      for (const event of events) {
        let reminderWindow = null;
        let shouldSendReminder = false;

        if (event.purpose === EVENT_PURPOSE.PUBLIC_HOLIDAY && event.date === today && !event.reminderSent) {
          shouldSendReminder = true;
          reminderWindow = "holiday";
        }

        if (!shouldSendReminder && event.date === today && !event.reminder1hSent && event.startTime) {
          const eventStart = parseEventDateTime(event.date, event.startTime);
          const diffMs = eventStart - now;
          if (diffMs >= 0 && diffMs <= 60 * 60 * 1000) {
            shouldSendReminder = true;
            reminderWindow = "1h";
          }
        }

        if (!shouldSendReminder && event.date === tomorrow && !event.reminder24hSent && event.startTime) {
          const eventStart = parseEventDateTime(event.date, event.startTime);
          const diffMs = eventStart - now;
          const twentyFourHours = 24 * 60 * 60 * 1000;
          if (Math.abs(diffMs - twentyFourHours) <= 2 * 60 * 1000) {
            shouldSendReminder = true;
            reminderWindow = "24h";
          }
        }

        if (!shouldSendReminder) continue;

        const reminder = buildReminderMessage(event, reminderWindow);

        if (event.purpose === EVENT_PURPOSE.PUBLIC_HOLIDAY) {
          const staffUsers = await User.find({
            role: { $ne: ROLES.ADMIN },
            isActive: true
          }).select("_id");

          const userIds = staffUsers.map((u) => u._id.toString());
          for (const userId of userIds) {
            await sendNotification(userId, {
              type: "reminder",
              title: reminder.title,
              message: reminder.message
            });
          }
          event.reminderSent = true;
        } else {
          await sendNotification(event.userId, {
            type: "reminder",
            title: reminder.title,
            message: reminder.message
          });
          if (reminderWindow === "24h") event.reminder24hSent = true;
          if (reminderWindow === "1h") event.reminder1hSent = true;
        }

        await event.save();
      }
    } catch (error) {
      console.error("❌ Event scheduler error:", error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  schedulerActive = true;
  console.log("✅ Event scheduler initialized - checking every minute");
}
