// Import necessary libraries for Gemini and your email provider
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Resend } = require('resend'); // Example using Resend for email

// Initialize the clients with your API keys from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  try {
    // 1. Get payment data from the Stripe webhook
    const stripeEvent = JSON.parse(event.body);

    // Only handle successful payment events
    if (stripeEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = stripeEvent.data.object;
      const amount = (paymentIntent.amount / 100).toFixed(2); // amount in dollars
      const donorEmail = paymentIntent.receipt_email;

      // 2. Call the Gemini API to generate a personalized email
      const model = genAI.getGenerativeModel({ model: "gemini-pro"});
      const prompt = `A donor just gave $${amount} to our 'Social Good Donations' charity for clean water. Write a short, heartfelt, and personalized thank you email to them. Mention the impact of their generous donation. Keep it under 150 words.`;

      const result = await model.generateContent(prompt);
      const emailText = await result.response.text();

      // 3. Send the email using your chosen email service (e.g., Resend)
      await resend.emails.send({
        from: 'Donations <your-email@yourdomain.com>', // Use your verified sender email
        to: donorEmail,
        subject: 'A Heartfelt Thank You For Your Donation!',
        text: emailText,
      });

      console.log('Personalized thank you email sent successfully to:', donorEmail);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Webhook processed" }),
    };

  } catch (err) {
    console.error("Error processing webhook:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
