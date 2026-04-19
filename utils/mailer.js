const axios = require("axios");
require("dotenv").config();

const sendEmail = async (toEmail, subject, htmlBody) => {
  try {
    const fullHtml = `
            <div style="background: #fbfbfb; color: #1c1917; padding: 40px; border-top: 8px solid #b91c1c; font-family: serif; max-width: 600px; margin: auto; border-left: 1px solid #e7e5e4; border-right: 1px solid #e7e5e4; border-bottom: 1px solid #e7e5e4;">
                <h1 style="color: #b91c1c; text-align: center; font-size: 28px; border-bottom: 1px solid #e7e5e4; padding-bottom: 20px;">HINDU HOSTEL, PRAYAGRAJ</h1>
                <div style="margin: 30px 0; line-height: 1.8; font-size: 1.1rem; color: #444;">
                    ${htmlBody}
                </div>
                <p style="margin-top: 40px; font-size: 0.8rem; color: #78716c; text-align: center; border-top: 1px solid #e7e5e4; padding-top: 20px;">
                    This is an official administrative email from the Warden's Office. <br> 
                    <strong>Hindu Hostel Digital Portal</strong>
                </p>
            </div>
        `;

    const data = {
      sender: { name: "Hindu Hostel Admin", email: "mangalthemars@gmail.com" },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: fullHtml,
    };

    await axios.post("https://api.brevo.com/v3/smtp/email", data, {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
    });
  } catch (error) {
    throw error;
  }
};

const sendVerificationEmail = async (userEmail, userName, token) => {
  const baseUrl = process.env.BASE_URL;
  const url = `${baseUrl}/verify/${token}`;

  const body = `
        <p>Namaste <strong>${userName}</strong>,</p>
        <p>The Warden has registered you on the official Hindu Hostel digital portal. To activate your resident account and set your private password, please verify your email address below.</p>
        <div style="text-align: center;">
            <a href="${url}" style="background: #b91c1c; color: #fff; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block; margin-top: 20px; letter-spacing: 1px;">
                VERIFY & SET PASSWORD
            </a>
        </div>
        <p style="margin-top: 25px; font-style: italic; font-size: 0.9rem;">Note: This link is valid for 24 hours.</p>
    `;
  await sendEmail(userEmail, "🏛️ Verify Your Hindu Hostel Account", body);
};

const sendResetEmail = async (userEmail, userName, token) => {
  const baseUrl = process.env.BASE_URL;
  const url = `${baseUrl}/reset-password/${token}`;

  const body = `
        <p>Namaste <strong>${userName}</strong>,</p>
        <p>A password reset has been requested for your resident account on the Hindu Hostel portal.</p>
        <div style="text-align: center;">
            <a href="${url}" style="background: #1c1917; color: #fff; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block; margin-top: 20px;">
                RESET PASSWORD
            </a>
        </div>
        <p style="margin-top: 25px;">If you did not request this, please ignore this email or contact the Warden's office immediately.</p>
    `;
  await sendEmail(userEmail, "🔒 Reset Your Portal Password", body);
};

module.exports = { sendVerificationEmail, sendResetEmail, sendEmail };
