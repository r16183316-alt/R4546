
import { GoogleGenAI } from "@google/genai";

export async function modifyImage(imageBase64: string, userPrompt: string): Promise<string[]> {
  // Initialize AI inside the function to ensure fresh context/key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const optimizedPrompt = `
用户指令：“${userPrompt}”

请一次性生成4张真实摄影风格的16:9图片：

要求1（图1：基础修改）：
- 视角构图完全不变
- 仅根据指令修改核心元素
- 其他所有细节保持不变
- 真实场景，自然光线

要求2（图2：视角变化）：
- 执行相同修改
- 调整拍摄角度（15-30度变化）
- 真实透视关系

要求3（图3：场景变化）：
- 执行相同修改
- 更换到不同但合理的背景环境
- 保持相同视角

要求4（图4：综合变化）：
- 执行相同修改
- 新视角（与图2不同）
- 新场景（与图3不同）

关键约束：必须真实照片风格，不要插画、概念图、数字艺术。
`;

  const base64Data = imageBase64.split(',')[1] || imageBase64;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          { text: optimizedPrompt },
        ],
      },
    });

    const imageUrls: string[] = [];
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrls.push(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    }

    // If API returned no images, we should know
    if (imageUrls.length === 0) {
      console.warn("Gemini returned successfully but with 0 image parts.");
    }

    return imageUrls;
  } catch (error) {
    console.error("Gemini API Error details:", error);
    throw error;
  }
}
