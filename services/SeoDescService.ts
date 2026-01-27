import axios from "axios";
import { Product } from "../entity/Product";

export async function generateSeoDesc(product: Product): Promise<string> {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You generate SEO-friendly product descriptions.",
        },
        {
          role: "user",
          content: `
Product name: ${product.name}
Description: ${product.description}
Category: ${product.category?.name}
Price: ${product.priceUnit}
Weight: ${product.weightUnit}

Generate HTML using <h1>, <p>, and <ul>.
          `,
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content;
}
