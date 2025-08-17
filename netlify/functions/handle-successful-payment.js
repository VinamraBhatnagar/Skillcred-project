// Import necessary libraries
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Resend } = require('resend');

// Initialize the clients with your API keys from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  try {
    // Get the Stripe signature from the request headers
    const signature = event.headers['stripe-signature'];

    // Verify that the event is genuinely from Stripe
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Only handle successful payment events
    if (stripeEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = stripeEvent.data.object;
      const amount = (paymentIntent.amount / 100).toFixed(2);

      // ✅ Try receipt_email first, fallback to metadata
      const donorEmail = paymentIntent.receipt_email || paymentIntent.metadata?.donor_email;

      if (!donorEmail || donorEmail === "not_provided") {
        console.log("No donor email found for this payment intent. Skipping email.");
        return { 
          statusCode: 200, 
          body: JSON.stringify({ message: "No email found, but webhook processed." }) 
        };
      }

      // Call the Gemini API to generate a personalized email
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});
      const prompt = `A donor just gave $${amount} to our 'Social Good Donations' charity for clean water. Write a short, heartfelt, and personalized thank you email to them. Mention the impact of their generous donation. Keep it under 150 words.`;

      const result = await model.generateContent(prompt);
      const emailText = await result.response.text();

      // Send the email using Resend
      await resend.emails.send({
        from: 'Donations <vinibhatnagar123@gmail.com>', // ✅ make sure this email is verified in Resend
        to: donorEmail,
        subject: 'A Heartfelt Thank You For Your Donation!',
        text: emailText,
      });

      console.log('Personalized thank you email sent successfully to:', donorEmail);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Webhook processed successfully" }),
    };

  } catch (err) {
    console.error("Error processing webhook:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
    };
  }
};
