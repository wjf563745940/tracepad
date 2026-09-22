import type { Phase } from './replay.js';

/**
 * A scripted multimodal agent run: the model searches, checks the weather, then
 * produces three binary artefacts (an illustration, a chart, a route map).
 *
 * Everything is expressed the way a real OpenAI Chat Completions stream would
 * send it, plus `media` events — which no chat stream carries, so those are
 * pushed directly, exactly as a host application would.
 */

const RUN_ID = 'chatcmpl-tracepad-multimodal';
const SEARCH_ID = 'call_search_1';
const WEATHER_ID = 'call_weather_1';
const IMAGE_ID = 'call_image_1';
const CHART_ID = 'call_chart_1';
const ROUTE_ID = 'call_route_1';

const chunkText = (text: string, size = 6): string[] => {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
};

const reasoning = (text: string) => ({
  id: RUN_ID,
  choices: [{ index: 0, delta: { reasoning_content: text } }]
});

const answer = (text: string) => ({ id: RUN_ID, choices: [{ index: 0, delta: { content: text } }] });

const call = (index: number, id: string, name: string, args = '') => ({
  id: RUN_ID,
  choices: [
    {
      index: 0,
      delta: {
        tool_calls: [{ index, id, type: 'function', function: { name, arguments: args } }]
      }
    }
  ]
});

const argsOf = (index: number, text: string) => ({
  id: RUN_ID,
  choices: [{ index: 0, delta: { tool_calls: [{ index, function: { arguments: text } }] } }]
});

const finish = (reason: string) => ({
  id: RUN_ID,
  choices: [{ index: 0, delta: {}, finish_reason: reason }]
});

const usage = (prompt: number, completion: number) => ({
  id: RUN_ID,
  choices: [],
  usage: { prompt_tokens: prompt, completion_tokens: completion }
});

export const MULTIMODAL_SCRIPT: Phase[] = [
  {
    kind: 'sse',
    gap: 24,
    chunks: [
      ...chunkText('用户要一份杭州明日骑行攻略，还要配图。先查路线和天气。').map(reasoning),
      call(0, SEARCH_ID, 'search_web', ''),
      ...chunkText('{"query": "杭州 环湖骑行 路线 推荐"}', 8).map((t) => argsOf(0, t)),
      finish('tool_calls'),
      usage(146, 38)
    ]
  },
  {
    kind: 'push',
    gap: 160,
    events: [
      {
        type: 'tool.result',
        id: SEARCH_ID,
        output: '{"top": "西湖环湖线", "distance_km": 18.4, "climb_m": 120, "best_time": "清晨"}'
      }
    ]
  },
  {
    kind: 'sse',
    gap: 24,
    chunks: [
      ...chunkText('拿到路线了。现在确认天气，同时让图像工具出一张主图。').map(reasoning),
      call(0, WEATHER_ID, 'get_weather', ''),
      ...chunkText('{"city": "杭州", "date": "2026-09-23"}', 8).map((t) => argsOf(0, t)),
      call(1, IMAGE_ID, 'generate_image', ''),
      ...chunkText('{"prompt": "西湖清晨骑行，暖色调插画"}', 8).map((t) => argsOf(1, t)),
      finish('tool_calls'),
      usage(188, 54)
    ]
  },
  {
    kind: 'push',
    gap: 200,
    events: [
      {
        type: 'tool.result',
        id: WEATHER_ID,
        output: '{"temp": "24~30℃", "wind": "东南风 3 级", "rain": "20%", "uv": "中等"}'
      },
      {
        type: 'tool.result',
        id: IMAGE_ID,
        output: '{"url": "/media/cycling.svg", "width": 480, "height": 320}'
      },
      {
        type: 'media',
        id: IMAGE_ID,
        media: {
          kind: 'image',
          url: '/media/cycling.svg',
          alt: '西湖清晨骑行插画',
          label: '主图 · 晨骑',
          width: 480,
          height: 320
        }
      }
    ]
  },
  {
    kind: 'sse',
    gap: 24,
    chunks: [
      ...chunkText('天气不错。再补一张逐时图表和路线图，攻略就齐了。').map(reasoning),
      call(0, CHART_ID, 'render_chart', ''),
      ...chunkText('{"type": "hourly", "metrics": ["temp", "rain"]}', 8).map((t) => argsOf(0, t)),
      call(1, ROUTE_ID, 'plan_route', ''),
      ...chunkText('{"from": "断桥", "to": "苏堤", "mode": "bike"}', 8).map((t) => argsOf(1, t)),
      finish('tool_calls'),
      usage(204, 61)
    ]
  },
  {
    kind: 'push',
    gap: 200,
    events: [
      {
        type: 'tool.result',
        id: CHART_ID,
        output: '{"url": "/media/weather-chart.svg", "points": 9}'
      },
      {
        type: 'media',
        id: CHART_ID,
        media: {
          kind: 'image',
          url: '/media/weather-chart.svg',
          alt: '逐时温度与降水概率',
          label: '逐时天气',
          width: 480,
          height: 320
        }
      },
      {
        type: 'tool.result',
        id: ROUTE_ID,
        output: '{"url": "/media/route.svg", "distance_km": 18.4}'
      },
      {
        type: 'media',
        id: ROUTE_ID,
        media: {
          kind: 'image',
          url: '/media/route.svg',
          alt: '环湖骑行路线图',
          label: '路线图',
          width: 480,
          height: 320
        }
      }
    ]
  },
  {
    kind: 'sse',
    gap: 24,
    chunks: [
      ...chunkText('三张图都齐了，可以给出完整攻略。').map(reasoning),
      ...chunkText(
        '明天杭州 24~30℃，东南风 3 级，降水概率 20%，总体适合骑行。建议走西湖环湖线，全程 18.4 公里、爬升 120 米，清晨出发最舒服。带一件薄雨衣，避开午后时段。'
      ).map(answer),
      finish('stop'),
      usage(96, 128)
    ]
  }
];
