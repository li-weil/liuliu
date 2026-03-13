import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface WalkTheme {
  title: string;
  description: string;
  category: string;
  missions: string[];
  vibeColor: string;
}

export interface MapPOI {
  title: string;
  uri: string;
  lat?: number;
  lng?: number;
}

export async function generateAITheme(mood: string, weather: string, season: string, preference: string, locationContext: string): Promise<WalkTheme> {
  const prompt = `根据以下参数生成一个创意 City Walk 主题：
  - 心情: "${mood}"
  - 天气: "${weather}"
  - 季节: "${season}"
  - 偏好: "${preference}"
  - 当前位置环境: "${locationContext}"
  
  要求：
  1. 主题应该具有启发性、诗意并鼓励探索。
  2. 任务必须具体且可操作，并且必须与“当前位置环境”高度契合。例如，如果在现代商业区，不要生成“寻找老弄堂”的任务。
  3. 每次生成的内容必须具有高度的随机性和独特性，避免重复。
  4. 即使输入相同，也要尝试从不同的角度（如感官、历史、建筑、情感等）切入。

  以 JSON 格式返回结果，结构如下：
  {
    "title": "主题标题",
    "description": "主题的诗意描述",
    "category": "视觉/感官/互动/城市/自然",
    "missions": ["任务 1", "任务 2", "任务 3"],
    "vibeColor": "代表氛围的十六进制颜色代码"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            missions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            vibeColor: { type: Type.STRING }
          },
          required: ["title", "description", "category", "missions", "vibeColor"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating AI theme:", error);
    return {
      title: "未知的漫步",
      description: "在城市的脉络中寻找未曾察觉的惊喜。",
      category: "探索",
      missions: ["寻找一个让你微笑的细节", "记录一种独特的城市气味", "在长椅上坐下观察 5 分钟"],
      vibeColor: "#6366f1"
    };
  }
}

export async function generateDynamicPreset(category: string, locationContext: string): Promise<WalkTheme> {
  const prompt = `生成一个关于 "${category}" 的 City Walk 主题。
  当前位置环境: "${locationContext}"
  
  特别要求：
  - 如果是“形状漫步”，不要局限于圆形，可以是三角形、多边形、不规则图形或多种图形的组合。
  - 如果是“色彩漫步”，不要局限于单一颜色，可以是对比色、渐变色或特定的色彩组合。
  - 任务必须是随机生成的，每次都要有新鲜感。
  - 任务必须符合当前环境（${locationContext}）。

  以 JSON 格式返回结果：
  {
    "title": "主题标题",
    "description": "描述",
    "category": "${category}",
    "missions": ["任务 1", "任务 2", "任务 3"],
    "vibeColor": "十六进制颜色"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            missions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            vibeColor: { type: Type.STRING }
          },
          required: ["title", "description", "category", "missions", "vibeColor"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating dynamic preset:", error);
    return PRESET_THEMES[0];
  }
}

export async function getLocationContext(lat: number, lng: number): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `根据经纬度 (${lat}, ${lng})，描述该地点的城市环境特征（例如：现代商业区、老旧居民区、公园绿地、工业遗址等）。只需返回简短的描述词。`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "城市街道";
  } catch (error) {
    console.error("Error getting location context:", error);
    return "城市街道";
  }
}

export async function generateCombinedTheme(themes: WalkTheme[]): Promise<WalkTheme> {
  const titles = themes.map(t => t.title).join(", ");
  const prompt = `结合以下 City Walk 主题：${titles}。
  创建一个融合了这些概念的单一集成主题。
  例如，如果主题是“形状”和“颜色”，任务可能是“找到一个红色的圆形物体”。
  以 JSON 格式返回结果：
  {
    "title": "组合主题标题",
    "description": "描述这些世界如何碰撞",
    "category": "组合",
    "missions": ["组合任务 1", "组合任务 2", "组合任务 3"],
    "vibeColor": "混合后的十六进制颜色"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            missions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            vibeColor: { type: Type.STRING }
          },
          required: ["title", "description", "category", "missions", "vibeColor"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating combined theme:", error);
    return {
      title: "混合探索",
      description: "你所选主题的奇妙融合。",
      category: "组合",
      missions: ["找到一个符合所有选定主题的事物", "发现一个独特的交汇点", "捕捉一个复杂的瞬间"],
      vibeColor: "#94a3b8"
    };
  }
}

export async function fetchNearbyPOIs(lat: number, lng: number): Promise<MapPOI[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "搜索我附近的有趣打卡点、历史建筑或独特景点。",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      return chunks
        .filter((chunk: any) => chunk.maps)
        .map((chunk: any) => ({
          title: chunk.maps.title,
          uri: chunk.maps.uri
        }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching nearby POIs:", error);
    return [];
  }
}

export const PRESET_THEMES: WalkTheme[] = [
  {
    title: "形状漫步：圆圈",
    description: "城市建立在直线之上，但圆圈是它的灵魂。今天去寻找那些曲线吧。",
    category: "视觉",
    missions: ["寻找一个圆形窗户", "发现一个圆形的井盖", "定位一个拱形门廊"],
    vibeColor: "#3b82f6"
  },
  {
    title: "声音漫步：城市回响",
    description: "闭上眼睛片刻。城市想告诉你什么？",
    category: "感官",
    missions: ["记录远处警报器的声音", "倾听公园里树叶的沙沙声", "寻找一个完全安静的地方"],
    vibeColor: "#10b981"
  },
  {
    title: "绿色漫步：缝隙植物",
    description: "生命总会找到出路。寻找那些生长在水泥缝隙中的微小绿色。",
    category: "自然",
    missions: ["寻找一朵长在墙上的花", "在阴凉角落发现苔藓", "定位一棵比周围建筑更老的树"],
    vibeColor: "#84cc16"
  },
  {
    title: "动物漫步：城市伙伴",
    description: "我们并不孤单。寻找那些与我们共享街道的生物。",
    category: "互动",
    missions: ["发现一只流浪猫", "寻找一个鸟巢", "观察一只正在遛人的狗"],
    vibeColor: "#f59e0b"
  }
];
