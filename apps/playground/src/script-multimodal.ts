import type { Phase } from './replay.js';

/**
 * A deliberately deep scripted run: long reasoning, parallel tool calls, a slow
 * sub-agent, a failed call that gets retried, and tokens attributed step by step.
 *
 * The SSE parts are what a real OpenAI Chat Completions stream would send (each
 * turn uses a fresh choice index so it becomes its own step). Everything a chat
 * stream cannot carry — tool results, sub-agent steps, media, per-step usage —
 * is pushed directly, exactly as a host application would.
 *
 * Gaps are uneven on purpose: they are the only thing that produces a believable
 * duration distribution, which is what the gantt and usage views draw.
 */

const RUN = 'chatcmpl-tracepad-deep';
const T_SEARCH = 'call_search_1';
const T_WEATHER = 'call_weather_1';
const T_IMAGE = 'call_image_1';
const T_CHART = 'call_chart_1';
const T_CHART_RETRY = 'call_chart_2';
const T_ROUTE = 'call_route_1';
const SUB = 'sub-illustrator';

const chunkText = (text: string, size = 5): string[] => {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
};

const reasoning = (index: number, text: string) => ({
  id: RUN,
  choices: [{ index, delta: { reasoning_content: text } }]
});

const answer = (index: number, text: string) => ({
  id: RUN,
  choices: [{ index, delta: { content: text } }]
});

const declareCalls = (
  index: number,
  calls: Array<{ toolIndex: number; id: string; name: string }>
) => ({
  id: RUN,
  choices: [
    {
      index,
      delta: {
        tool_calls: calls.map((call) => ({
          index: call.toolIndex,
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: '' }
        }))
      }
    }
  ]
});

const feedArgs = (index: number, toolIndex: number, text: string) => ({
  id: RUN,
  choices: [{ index, delta: { tool_calls: [{ index: toolIndex, function: { arguments: text } }] } }]
});

const finish = (index: number, reason: string) => ({
  id: RUN,
  choices: [{ index, delta: {}, finish_reason: reason }]
});

const PLAN_TEXT =
  '用户要一份杭州明日骑行攻略，还要配图。我拆成四步：先并行查天气和路线，判断明天到底适不适合骑；' +
  '如果天气过关，就交给图像子 agent 出一张主图；再补一张逐时天气图表和一张路线图，让攻略有据可依；' +
  '最后综合给出建议，提醒装备和时段。风险和天气强相关，所以天气必须拿到手再决定后面走不走。先并发查这两项。';

const WEATHER_VERDICT =
  '天气拿到了：24~30℃，东南风 3 级，降水概率 20%。风不大、降水偏低，总体适合骑行，' +
  '但 30℃ 的高温意味着午后不适，应该建议清晨出发。可以让子 agent 开始出主图了。';

const AFTER_IMAGE =
  '主图出来了，风格和攻略调性一致。还差两张支撑材料：一张逐时天气图（能看出几点最热），' +
  '一张路线图（标注爬升和补给点）。两张可以一起要。';

const WRAP_UP =
  '三张图都齐了，信息也够充分。写攻略时要突出三件事：明早适合骑、午后要避开、带薄雨衣。' +
  '把路线距离和爬升一并给出，让人能直接照着执行。';

const FINAL_TEXT =
  '明天杭州 24~30℃，东南风 3 级，降水概率 20%，骑行条件总体不错。\n\n' +
  '推荐路线：西湖环湖线，全程 18.4 公里，累计爬升 120 米，路况平整，适合公路车和共享单车。\n' +
  '时段建议：清晨 6:00-9:00 出发最舒服；11:00 之后地表温度升高，建议避开午后。\n' +
  '装备提醒：带一件薄雨衣（降水概率 20%），水至少 1 升，注意防晒。\n' +
  '风险提示：环湖东路段周末人流较大，注意减速避让行人。';

export const MULTIMODAL_SCRIPT: Phase[] = [
  // ---- turn 1: plan, then two parallel lookups -----------------------------
  {
    kind: 'sse',
    gap: 16,
    chunks: [...chunkText(PLAN_TEXT).map((text) => reasoning(0, text))]
  },
  {
    kind: 'sse',
    gap: 16,
    chunks: [
      declareCalls(0, [
        { toolIndex: 0, id: T_SEARCH, name: 'search_web' },
        { toolIndex: 1, id: T_WEATHER, name: 'get_weather' }
      ]),
      ...chunkText('{"query": "杭州 环湖骑行 路线 爬升", "top_k": 5}', 8).map((t) => feedArgs(0, 0, t)),
      ...chunkText('{"city": "杭州", "date": "2026-09-23", "hourly": true}', 8).map((t) =>
        feedArgs(0, 1, t)
      ),
      finish(0, 'tool_calls')
    ]
  },
  {
    kind: 'push',
    gap: 40,
    events: [{ type: 'usage', id: `${RUN}:reasoning:0`, usage: { inputTokens: 428, outputTokens: 86 } }]
  },
  // search is quick, weather is slow — that gap is the whole point of the gantt.
  {
    kind: 'push',
    gap: 340,
    events: [
      {
        type: 'tool.result',
        id: T_SEARCH,
        output:
          '{"top": "西湖环湖线", "distance_km": 18.4, "climb_m": 120, "surface": "沥青", "best_time": "清晨", "crowd": "周末环湖东路人流大"}'
      },
      { type: 'usage', id: T_SEARCH, usage: { inputTokens: 182 } }
    ]
  },
  {
    kind: 'push',
    gap: 980,
    events: [
      {
        type: 'tool.result',
        id: T_WEATHER,
        output:
          '{"temp": "24~30℃", "wind": "东南风 3 级", "rain": "20%", "uv": "中等", "hourly": [{"h": 6, "t": 24}, {"h": 9, "t": 27}, {"h": 12, "t": 30}, {"h": 15, "t": 29}, {"h": 18, "t": 26}]}'
      },
      { type: 'usage', id: T_WEATHER, usage: { inputTokens: 164 } }
    ]
  },

  // ---- turn 2: hand illustration work to a sub-agent -----------------------
  {
    kind: 'sse',
    gap: 16,
    chunks: [...chunkText(WEATHER_VERDICT).map((text) => reasoning(1, text))]
  },
  {
    kind: 'push',
    gap: 40,
    events: [
      { type: 'step.start', id: SUB, kind: 'subagent', parentId: RUN, label: 'illustrator' },
      { type: 'tool.call', id: T_IMAGE, parentId: SUB, name: 'generate_image', args: '{"prompt": "西湖清晨骑行，暖色调插画", "ratio": "3:2"}' },
      { type: 'usage', id: `${RUN}:reasoning:1`, usage: { inputTokens: 246, outputTokens: 52 } }
    ]
  },
  {
    kind: 'push',
    gap: 1720,
    events: [
      { type: 'tool.result', id: T_IMAGE, output: '{"url": "/media/cycling.svg", "width": 480, "height": 320, "seed": 8821}' },
      {
        type: 'media',
        id: T_IMAGE,
        media: { kind: 'image', url: '/media/cycling.svg', alt: '西湖清晨骑行插画', label: '主图 · 晨骑', width: 480, height: 320 }
      },
      { type: 'usage', id: T_IMAGE, usage: { outputTokens: 342 } },
      { type: 'step.end', id: SUB, status: 'ok' }
    ]
  },

  // ---- turn 3: two more artefacts; the first chart call fails --------------
  {
    kind: 'sse',
    gap: 16,
    chunks: [...chunkText(AFTER_IMAGE).map((text) => reasoning(2, text))]
  },
  {
    kind: 'sse',
    gap: 16,
    chunks: [
      declareCalls(2, [
        { toolIndex: 0, id: T_CHART, name: 'render_chart' },
        { toolIndex: 1, id: T_ROUTE, name: 'plan_route' }
      ]),
      ...chunkText('{"type": "hourly", "metrics": ["temp", "rain"]}', 8).map((t) => feedArgs(2, 0, t)),
      ...chunkText('{"from": "断桥", "to": "苏堤", "mode": "bike"}', 8).map((t) => feedArgs(2, 1, t)),
      finish(2, 'tool_calls')
    ]
  },
  {
    kind: 'push',
    gap: 40,
    events: [{ type: 'usage', id: `${RUN}:reasoning:2`, usage: { inputTokens: 214, outputTokens: 44 } }]
  },
  {
    kind: 'push',
    gap: 620,
    events: [
      { type: 'tool.result', id: T_CHART, error: 'upstream timeout after 600ms' },
      { type: 'usage', id: T_CHART, usage: { inputTokens: 96 } }
    ]
  },
  {
    kind: 'push',
    gap: 60,
    events: [
      {
        type: 'tool.call',
        id: T_CHART_RETRY,
        parentId: RUN,
        name: 'render_chart',
        args: '{"type": "hourly", "metrics": ["temp", "rain"], "retry": 1}'
      }
    ]
  },
  {
    kind: 'push',
    gap: 1140,
    events: [
      { type: 'tool.result', id: T_CHART_RETRY, output: '{"url": "/media/weather-chart.svg", "points": 9}' },
      {
        type: 'media',
        id: T_CHART_RETRY,
        media: { kind: 'image', url: '/media/weather-chart.svg', alt: '逐时温度与降水概率', label: '逐时天气', width: 480, height: 320 }
      },
      { type: 'usage', id: T_CHART_RETRY, usage: { inputTokens: 152, outputTokens: 128 } }
    ]
  },
  {
    kind: 'push',
    gap: 860,
    events: [
      { type: 'tool.result', id: T_ROUTE, output: '{"url": "/media/route.svg", "distance_km": 18.4, "climb_m": 120}' },
      {
        type: 'media',
        id: T_ROUTE,
        media: { kind: 'image', url: '/media/route.svg', alt: '环湖骑行路线图', label: '路线图', width: 480, height: 320 }
      },
      { type: 'usage', id: T_ROUTE, usage: { inputTokens: 148, outputTokens: 96 } }
    ]
  },

  // ---- turn 4: write it up -------------------------------------------------
  {
    kind: 'sse',
    gap: 16,
    chunks: [...chunkText(WRAP_UP).map((text) => reasoning(3, text))]
  },
  {
    kind: 'push',
    gap: 40,
    events: [
      { type: 'usage', id: `${RUN}:reasoning:3`, usage: { inputTokens: 186, outputTokens: 214 } }
    ]
  },
  // The closing turn must be the last phase: `createReplay` only lets the final
  // stream's `run.end` through, otherwise the run would stay "running" forever.
  {
    kind: 'sse',
    gap: 16,
    chunks: [...chunkText(FINAL_TEXT).map((text) => answer(3, text)), finish(3, 'stop')]
  }
];
