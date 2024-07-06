import { Context, Dict, Random, Schema, h, sleep } from "koishi";
import * as MomonaCore from "./momona";
import { getArrayValue, getValue } from "./utils";
import * as utils from "./utils";
import {} from "koishi-plugin-cron";
import Shooter from "koishi-plugin-puppeteer";
import { Page } from "puppeteer-core";
import OneBotBot, { CQCode, OneBot } from "@koishijs/plugin-adapter-onebot";
import * as google_translate from "@google-cloud/translate";
import { TweetV1, TwitterApi } from "twitter-api-v2";

export const name = "momona-blhx";
export const using = ["cron"] as const;
export const bilibili_params = {
  host_uid: 233114659,
  offset_dynamic_id: 0,
  need_top: 0,
};

export interface Config {
  twitter?: Array<string>;
  twitter_token?: string;
  bilibili_url?: string;
  onebot_mode?: string;
  onebot_combined_qq?: string;
}

export const Config: Schema<Config> = Schema.object({
  twitter: Schema.array(Schema.string()).default([
    "azurlane_staff",
    "AzurLane_EN",
  ]),
  twitter_token: Schema.string(),
  bilibili_url: Schema.string().default(
    "https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history"
  ),
  onebot_mode: Schema.union(["combined", "sliced"]).default("sliced"),
  onebot_combined_qq: Schema.string().default("353252500"),
});

export interface BLHXData {
  sent_post: Dict<Dict<Array<string | number>>>;
  broadcast: Dict<Array<string>>;
}

export const BLHXData: Schema<BLHXData> = Schema.object({
  sent_post: Schema.dict(
    Schema.dict(Schema.array(Schema.union([Schema.string(), Schema.number()])))
  ).default({
    twitter: {},
    bilibili: { ALCN: [] },
  }),
  broadcast: Schema.dict(Schema.array(Schema.string())).default({
    discord: [],
    onebot: [],
  }),
});

export function apply(ctx: Context, cfg: Config) {
  cfg = Config(cfg);
  MomonaCore.loadData("BLHX", BLHXData);
  const logger = ctx.logger("momona-blhx");
  const translate_v2 = new google_translate.v2.Translate();
  const dc_bot = "discord:1089721872255557732";
  const ob_bot = "onebot:3403896494";
  ctx
    .command("blhx <option>", "碧蓝航线转推开关")
    .usage("开关碧蓝航线转推功能，开启后自动转发b博和推特消息")
    .example(".blhx on")
    .action(({ session }, option) => {
      if (option) {
        if (utils.isGroupAdmin(session)) {
          const broadcast =
            MomonaCore.momona_data["BLHX"].broadcast[session.platform];
          if (option.trim().toLowerCase() === "on") {
            !broadcast.includes(session.channelId)
              ? broadcast.push(session.channelId)
              : null;
            MomonaCore.saveData("BLHX");
            return session.text("blhx_on");
          } else if (option.trim().toLowerCase() === "off") {
            if (broadcast.includes(session.channelId)) {
              const index = broadcast.indexOf(session.channelId);
              broadcast.splice(index, 1);
            }
            MomonaCore.saveData("BLHX");
            return session.text("blhx_off");
          }
        }
      }
    });

  ctx
    .command("test <option> [index:integer]", "test", {
      authority: 4,
      hidden: true,
    })
    .action(async ({ session }, option, index) => {
      if (option === "twitter") {
        if (index === undefined) {
          return;
        }
        let page: Page;
        const url = "https://twitter.com/azurlane_staff";
        try {
          page = await ctx.puppeteer.page();
          await page.setViewport({ width: 1080, height: 720 });
          logger.info("正在加载推特timeline");
          await page.goto(url);
          try {
            await page.waitForNetworkIdle({ timeout: 30000, idleTime: 1000 });
            logger.info("加载推特timeline完成");
          } catch (e) {}
          session.send(h.image(await page.screenshot({}), "data"));
          const tweets = await page.$$(`div[data-testid="tweetText"]`);
          logger.info("正在跳转推特页面");
          await tweets[index].click();
          await sleep(5000);
          session.send(h.image(await page.screenshot({}), "data"));
          await sleep(5000);
          session.send(h.image(await page.screenshot({}), "data"));
          await sleep(5000);
          session.send(h.image(await page.screenshot({}), "data"));
          await sleep(5000);
          session.send(h.image(await page.screenshot({}), "data"));
          let tweet_id = page.url().match(/\d+/)[0];
          logger.info("跳转推特页面完成");
          const buffer = await (
            await page.$('article[data-testid="tweet"]')
          ).screenshot({});
          session.send(h.image(buffer, "data"));
        } catch (e) {
          throw e;
        } finally {
          page?.close();
        }
      } else if (option === "bilibili") {
        const bilibili_data = (
          await ctx.http("GET", ctx.config.bilibili_url, {
            params: bilibili_params,
          })
        )["data"];
        const card = bilibili_data["cards"][index];
        console.log(JSON.stringify(card));
        await forwardDynamic(card);
      } else if (option === "msg") {
        const onebot = ctx.bots[ob_bot];
        const msg = (
          <message forward>
            <message>
              <author
                user-id={onebot.selfId}
                nickname="梦梦奈"
                avatar={onebot.avatar}
              ></author>
              アズールレーン公式发布了新推特： 【お知らせ】
              エイプリルフールミニイベント「一撃！PURIN！」、
              母港と海域に隠されている「ヒント」をすべて集めると、限定特殊装備を入手可能！
              入手期限は明日4月6日(木)メンテナンスまで！ ぜひ、お見逃しなく！
              #アズールレーン https://t.co/wzfRPLepHb
            </message>
            <message>
              <author
                user-id={onebot.selfId}
                nickname="梦梦奈"
                avatar={onebot.avatar}
              ></author>
              谷歌生草机：{"\n"}
              【注意】 愚人节小活动“吹！PURIN！”，
              集齐母港和海域隐藏的所有“提示”，即可获得限定特殊装备！
              截止日期为明天，4月6日（周四）维护！ 千万不要错过！ # 碧蓝航线
              https://t.co/wzfRPLepHb
            </message>
            <message>
              <author
                user-id={onebot.selfId}
                nickname="梦梦奈"
                avatar={onebot.avatar}
              ></author>
              1
            </message>
            <message>
              <author
                user-id={onebot.selfId}
                nickname="梦梦奈"
                avatar={onebot.avatar}
              ></author>
              1
            </message>
            <message>
              <author
                user-id={onebot.selfId}
                nickname="梦梦奈"
                avatar={onebot.avatar}
              ></author>
              1
            </message>
          </message>
        );
        console.log(await session.send(msg));
      } else if (option === "msg2") {
        session.send(
          <message forward>
            <message id="-2088438669"></message>
          </message>
        );
      } else if (option === "msg3") {
        const cq1: CQCode = {
          type: "json",
          data: {
            data: `{"app":"com.tencent.multimsg"&#44;"desc":"&#91;聊天记录&#93;"&#44;"bizsrc":""&#44;"view":"contact"&#44;"ver":"0.0.0.5"&#44;"prompt":"&#91;聊天记录&#93;"&#44;"meta":{"detail":{"news":&#91;{"text":"芙兰朵露琪露诺:  1"}&#44;{"text":"芙兰朵露琪露诺:  1"}&#93;&#44;"uniseq":"7225166442640429908"&#44;"resid":"ghdKwDMlOzURkjFZo3iuFzaIfCuyYTjuz8FYdUQVmQVT5FiGXXn9fj80rpHqtUSC"&#44;"summary":"查看2条转发消息"&#44;"source":"群聊的聊天记录"}}&#44;"config":{"round":1&#44;"forward":1&#44;"autosize":1&#44;"type":"normal"&#44;"width":300}}`,
          },
        };
        const cq2: CQCode = {
          type: "json",
          data: {
            app: "com.tencent.multimsg",
            desc: "&#91;聊天记录&#93;",
            bizsrc: "",
            view: "contact",
            ver: "0.0.0.5",
            prompt: "&#91;聊天记录&#93;",
            meta: `{"detail":{"news":&#91;{"text":"芙兰朵露琪露诺:  1"}&#44;{"text":"芙兰朵露琪露诺:  1"}&#93;&#44;"uniseq":"7225161631981349316"&#44;"resid":"ghdKwDMlOzURkjFZo3iuFzaIfCuyYTjuz8FYdUQVmQVT5FiGXXn9fj80rpHqtUSC"&#44;"summary":"查看2条转发消息"&#44;"source":"群聊的聊天记录"}}`,
            config: `{"round":1&#44;"forward":1&#44;"autosize":1&#44;"type":"normal"&#44;"width":300}`,
          },
        };
        const cq3: CQCode = {
          type: "at",
          data: {
            qq: "353252500",
          },
        };
        (session.bot as OneBotBot).internal.sendPrivateForwardMsg(353252500, [
          cq1,
        ]);
      } else if (option === "msg4") {
        session.send(<message id="1850482087" forward />);
      } else if (option === "screenshot1") {
        const img = await renderWebpage(
          "https://www.bilibili.com/opus/781348069994135671",
          ".bili-dyn-item__main" //".bili-opus-view"
        );
        session.send(h.image(img, "data"));
      } else if (option === "screenshot2") {
        session.send(
          h.image(
            await renderWebpage(
              "https://twitter.com/azurlane_EN/status/1646211587236151296",
              'article[data-testid="tweet"]'
            ),
            "data"
          )
        );
      }
    });

  async function translate(translate_text) {
    return (await translate_v2.translate(translate_text, "zh-CN"))[0];
  }

  function renderDynamic(dynamic) {
    const dynamic_type = dynamic["desc"]["type"];
    const dynamic_card = JSON.parse(dynamic["card"]);
    let message: string = "";
    const images = [];
    if (dynamic_type === 1) {
      const origin_card = JSON.parse(dynamic_card["origin"]);
      message = `${dynamic["desc"]["user_profile"]["info"]["uname"]}转发了${dynamic["desc"]["origin"]["user_profile"]["info"]["uname"]}的动态：
      ${dynamic_card["item"]["content"]}
      原动态：${origin_card["title"]}\n${origin_card["summary"]}`;
    } else if (dynamic_type === 4) {
      message = `${dynamic["desc"]["user_profile"]["info"]["uname"]}发布了新动态：
          ${dynamic_card["item"]["content"]}`;
    } else if (dynamic_type === 2) {
      for (const picture of dynamic_card["item"]["pictures"]) {
        images.push(picture["img_src"]);
      }
      message = `${dynamic["desc"]["user_profile"]["info"]["uname"]}发布了新动态：
          ${dynamic_card["item"]["description"]}`;
    } else if (dynamic_type === 64) {
      message = `${dynamic["desc"]["user_profile"]["info"]["uname"]}发布了新专栏：${dynamic_card["title"]}
          链接：https://www.bilibili.com/read/cv${dynamic_card["id"]}`;
    }
    return { message: message, images: images };
  }

  async function forwardDynamic(dynamic) {
    const HTTPREGEX = /https?:\/\/[-a-zA-Z0-9()@:%_\+.~#?&//=]+/;
    const broadcast_discord =
      MomonaCore.momona_data["BLHX"].broadcast["discord"];
    const broadcast_onebot = MomonaCore.momona_data["BLHX"].broadcast["onebot"];
    const message = renderDynamic(dynamic);
    ctx.bots[dc_bot].broadcast(broadcast_discord, message.message);
    ctx.bots[dc_bot].broadcast(
      broadcast_discord,
      message.images.map((src) => {
        return h.image(src);
      })
    );
    const onebot = ctx.bots[ob_bot];

    const dynamic_type = dynamic["desc"]["type"];
    let screenshot_buffer: Buffer;
    if (dynamic_type === 1) {
      screenshot_buffer = await renderWebpage(
        `https://www.bilibili.com/opus/${dynamic["desc"]["dynamic_id_str"]}`,
        ".bili-dyn-item__main"
      );
    } else if (dynamic_type === 4) {
      screenshot_buffer = await renderWebpage(
        `https://www.bilibili.com/opus/${dynamic["desc"]["dynamic_id_str"]}`,
        ".bili-opus-view"
      );
    } else if (dynamic_type === 2) {
      screenshot_buffer = await renderWebpage(
        `https://www.bilibili.com/opus/${dynamic["desc"]["dynamic_id_str"]}`,
        ".bili-opus-view"
      );
    } else if (dynamic_type === 64) {
      const dynamic_card = JSON.parse(dynamic["card"]);
      screenshot_buffer = await renderWebpage(
        `https://www.bilibili.com/read/cv${dynamic_card["id"]}`,
        ".article-container"
      );
    }
    onebot.broadcast(broadcast_onebot, h.image(screenshot_buffer, "data"));
    // 分片发送模式
    if (cfg.onebot_mode === "sliced") {
      onebot.broadcast(
        broadcast_onebot,
        slice(message.message).map((m) => h("message", m))
      );
      onebot.broadcast(
        broadcast_onebot,
        message.images.map((src) => {
          return h.image(src);
        })
      );
    } else if (cfg.onebot_mode === "combined") {
      if (message.message.length < 80) {
        // 合并转发模式
        // 长度小于80仍然发单独消息
        onebot.broadcast(broadcast_onebot, message.message);
        onebot.broadcast(
          broadcast_onebot,
          message.images.map((src) => {
            return h.image(src);
          })
        );
      } else {
        onebot.broadcast(broadcast_onebot, message.message.split("\n")[0]);
        const msg_id1: Promise<string[]> = onebot.sendPrivateMessage(
          cfg.onebot_combined_qq,
          <message forward>
            <message>
              <author
                user-id={onebot.selfId}
                nickname="梦梦奈"
                avatar={onebot.avatar}
              ></author>
              {message.message}
              {"\n"}
              {message.images.map((src) => {
                return h.image(src);
              })}
            </message>
          </message>
        );
        // const msg_id2: Promise<string[]> = onebot.sendPrivateMessage(
        //   cfg.onebot_combined_qq,
        //   h.image(screenshot_buffer, "data")
        // );
        onebot.broadcast(
          broadcast_onebot,
          <message forward>
            <message id={(await msg_id1)[0]} />
          </message>
        );
      }
    }
    logger.info(`已转发b博${dynamic["desc"]["dynamic_id"]}`);
  }

  async function renderWebpage(url: string, selector: string) {
    let page: Page;
    try {
      page = await ctx.puppeteer.page();
      await page.setViewport({ width: 1080, height: 720 });
      await page.goto(url);
      try {
        await page.waitForNetworkIdle({ timeout: 60000, idleTime: 3000 });
      } catch (e) {}
      const shooter: Shooter = await page.$(selector);
      return await shooter.screenshot({});
    } catch (e) {
      throw e;
    } finally {
      page?.close();
    }
  }

  function renderTweet(tweet: TweetV1) {
    const message: string = tweet.full_text;
    let info_line: string;
    if (tweet.retweeted_status) {
      info_line = `${tweet.user.name}转发了${tweet.retweeted_status.user.name}的推特：`;
      tweet = tweet.retweeted_status;
    } else {
      info_line = `${tweet.user.name}发布了新推特：`;
    }
    let entities;
    if (tweet.extended_entities) {
      entities = tweet.extended_entities;
    } else {
      entities = tweet.entities;
    }
    const images = [];
    if (entities.media) {
      for (const media of entities.media) {
        if (media.type === "photo" && media.media_url_https) {
          images.push(media.media_url_https);
        }
      }
    }
    const finalmessage = `${info_line}\n${tweet.full_text}`;
    return { message: finalmessage, images: images };
  }

  function slice(str: string) {
    const lines = str.split("\n");
    const words = lines.map((s) => s.split(" "));
    const results: string[] = [];
    let temp_str = "";
    for (const line of words) {
      const line_str = line.join(" ");
      if (temp_str.concat(line_str).length <= 80) {
        temp_str = temp_str.concat(line_str).concat("\n");
      } else {
        for (const word of line) {
          if (temp_str.concat(word).length <= 80) {
            temp_str = temp_str.concat(word).concat(" ");
          } else {
            if (temp_str.length <= 80) {
              results.push(temp_str.trim());
              temp_str = word.concat(" ");
            } else {
              results.push(temp_str.slice(0, 80));
              temp_str = temp_str.slice(80).concat(word, " ");
            }
          }
        }
        temp_str = temp_str.trim().concat("\n");
      }
    }
    while (temp_str.length > 0) {
      results.push(temp_str.slice(0, 80));
      temp_str = temp_str.slice(80);
    }
    return results;
  }

  async function forwardTweetOld(tweet: TweetV1) {
    const broadcast_discord =
      MomonaCore.momona_data["BLHX"].broadcast["discord"];
    const broadcast_onebot = MomonaCore.momona_data["BLHX"].broadcast["onebot"];
    const translated = await translate(tweet.full_text);
    const message = renderTweet(tweet);
    await ctx.bots[dc_bot].broadcast(broadcast_discord, message.message);
    ctx.bots[dc_bot].broadcast(
      broadcast_discord,
      message.images.map((src) => {
        return h.image(src);
      })
    );
    ctx.bots[dc_bot].broadcast(
      broadcast_discord,
      "谷歌生草机：\n" + translated
    );
    const onebot = ctx.bots[ob_bot];

    if (cfg.onebot_mode === "sliced") {
      await onebot.broadcast(
        broadcast_onebot,
        slice(message.message).map((m) => h("message", m))
      );
      onebot.broadcast(
        broadcast_onebot,
        message.images.map((src) => {
          return h.image(src);
        })
      );
      onebot.broadcast(
        broadcast_onebot,
        slice(`谷歌生草机：\n${translated}`).map((m) => h("message", m))
      );
    } else if (cfg.onebot_mode === "combined") {
      // const msg_id1 = await onebot.sendPrivateMessage(
      //   cfg.onebot_combined_qq,
      //   <>
      //     {message.message}
      //     {"\n"}
      //     {message.images.map((src) => {
      //       return h.image(src);
      //     })}
      //   </>
      // );
      // const msg_id2 = await onebot.sendPrivateMessage(
      //   cfg.onebot_combined_qq,
      //   <>
      //     谷歌生草机：{"\n"}
      //     {translated}
      //   </>
      // );
      // const msg_id = await onebot.sendPrivateMessage(
      //   cfg.onebot_combined_qq,
      //   <message forward>
      //     <message id={msg_id1[0]} />
      //     <message id={msg_id2[0]} />
      //   </message>
      // );

      const url: string =
        "https://twitter.com/azurlane_staff/status/" + tweet.id_str;
      const screenshot_buffer: Buffer = await renderWebpage(
        url,
        'article[data-testid="tweet"]'
      );

      onebot.broadcast(broadcast_onebot, message.message.split("\n")[0]);

      const msg_id1: Promise<string[]> = onebot.sendPrivateMessage(
        cfg.onebot_combined_qq,
        <message forward>
          <message>
            <author
              user-id={onebot.selfId}
              nickname="梦梦奈"
              avatar={onebot.avatar}
            ></author>
            {message.message}
            {"\n"}
            {message.images.map((src) => {
              return h.image(src);
            })}
          </message>
          <message>
            <author
              user-id={onebot.selfId}
              nickname="梦梦奈"
              avatar={onebot.avatar}
            ></author>
            谷歌生草机：{"\n"}
            {translated}
          </message>
        </message>
      );

      // const msg_id2: Promise<string[]> = onebot.sendPrivateMessage(
      //   cfg.onebot_combined_qq,
      //   h.image(screenshot_buffer, "data")
      // );

      onebot.broadcast(
        broadcast_onebot,
        <message forward>
          <message id={(await msg_id1)[0]} />
        </message>
      );
      onebot.broadcast(broadcast_onebot, h.image(screenshot_buffer, "data"));
    }

    logger.info(`已转发推特${tweet.id}`);
  }

  async function forwardTweet(tweet: Buffer, account: string, id: string) {
    const message = account + "发布了新推特：";
    const broadcast_discord =
      MomonaCore.momona_data["BLHX"].broadcast["discord"];
    const broadcast_onebot = MomonaCore.momona_data["BLHX"].broadcast["onebot"];
    await ctx.bots[dc_bot].broadcast(broadcast_discord, message);
    await ctx.bots[dc_bot].broadcast(
      broadcast_discord,
      h.image(tweet, "image/png")
    );
    const onebot = ctx.bots[ob_bot];
    onebot.broadcast(broadcast_onebot, message);
    const msg_id2: Promise<string[]> = onebot.sendPrivateMessage(
      cfg.onebot_combined_qq,
      h.image(tweet, "data")
    );
    onebot.broadcast(broadcast_onebot, h.image(tweet, "data"));

    logger.info(`已转发推特${id}`);
  }

  //动态检测定时任务
  ctx.cron("* * * * *", async () => {
    const sent_post = MomonaCore.momona_data["BLHX"].sent_post;
    const bilibili_data = (
      await ctx.http("GET", ctx.config.bilibili_url, {
        params: bilibili_params,
      })
    )["data"];

    // 检查b站动态
    for (const card of bilibili_data["cards"]) {
      if (!sent_post.bilibili["ALCN"].includes(card["desc"]["dynamic_id"])) {
        sent_post.bilibili["ALCN"].push(card["desc"]["dynamic_id"]);
        if (sent_post.bilibili["ALCN"].length > 50) {
          sent_post.bilibili["ALCN"].shift();
        }
        MomonaCore.saveData("BLHX");
        await forwardDynamic(card);
      }
    }
  });

  //推特检测定时任务
  /*ctx.cron("* * * * *", async () => {
    const sent_post = MomonaCore.momona_data["BLHX"].sent_post;
    // 检查推特
    for (const twitter_account of ctx.config.twitter) {
      let page: Page;
      const sent_tweets = getArrayValue(sent_post.twitter, twitter_account);
      const url = "https://twitter.com/" + twitter_account;
      try {
        page = await ctx.puppeteer.page();
        await page.setViewport({ width: 1080, height: 720 });
        await page.goto(url);
        try {
          await page.waitForNetworkIdle({ timeout: 30000, idleTime: 1000 });
        } catch (e) {}
        const tweets = await page.$$(`div[data-testid="tweetText"]`);
        await tweets[0].click();
        await sleep(5000);
        const tweet_id = page.url().match(/\d+/)[0];
        if (!sent_tweets.includes(tweet_id)) {
          sent_tweets.push(tweet_id);
          try {
            await page.waitForNavigation({
              waitUntil: "networkidle2",
              timeout: 120000,
            });
          } catch (e) {}
          if (sent_tweets.length > 50) {
            sent_tweets.shift();
          }
          MomonaCore.saveData("BLHX");
          const buffer = await (
            await page.$('article[data-testid="tweet"]')
          ).screenshot({});
          await forwardTweet(buffer, twitter_account, tweet_id);
        }
      } catch (e) {
        throw e;
      } finally {
        page?.close();
      }

      try {
        page = await ctx.puppeteer.page();
        await page.setViewport({ width: 1080, height: 720 });
        await page.goto(url);
        try {
          await page.waitForNetworkIdle({ timeout: 30000, idleTime: 1000 });
        } catch (e) {}
        const tweets = await page.$$(`div[data-testid="tweetText"]`);
        await tweets[1].click();
        await sleep(5000);
        const tweet_id = page.url().match(/\d+/)[0];
        if (!sent_tweets.includes(tweet_id)) {
          sent_tweets.push(tweet_id);
          try {
            await page.waitForNavigation({
              waitUntil: "networkidle2",
              timeout: 120000,
            });
          } catch (e) {}
          if (sent_tweets.length > 50) {
            sent_tweets.shift();
          }
          MomonaCore.saveData("BLHX");
          const buffer = await (
            await page.$('article[data-testid="tweet"]')
          ).screenshot({});
          await forwardTweet(buffer, twitter_account, tweet_id);
        }
      } catch (e) {
        throw e;
      } finally {
        page?.close();
      }
    }
  });*/
}
