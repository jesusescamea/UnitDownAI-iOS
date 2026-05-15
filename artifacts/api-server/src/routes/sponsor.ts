import { Router, type IRouter } from "express";
import { db, sponsorInquiries } from "@workspace/db";

const sponsorRouter: IRouter = Router();

sponsorRouter.post("/sponsor", async (req, res) => {
  const { companyName, contactName, email, phone, website, inquiryType, message } = req.body as Record<string, string>;

  if (!companyName || !contactName || !email || !inquiryType || !message) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }

  await db.insert(sponsorInquiries).values({
    companyName: companyName.trim(),
    contactName: contactName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || null,
    website: website?.trim() || null,
    inquiryType: inquiryType.trim(),
    message: message.trim(),
  });

  req.log.info({ email, companyName, inquiryType }, "Sponsor inquiry received");

  res.json({ ok: true });
});

export default sponsorRouter;
