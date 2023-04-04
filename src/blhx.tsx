import { Context, Dict, Random, Schema, h } from "koishi";
import * as MomonaCore from "./momona";
import { getArrayValue, getValue } from "./utils";
import * as utils from "./utils";
import {} from "koishi-plugin-cron";
import {} from "koishi-plugin-puppeteer";
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
  twitter: Array<string>;
  twitter_token: string;
  bilibili_url: string;
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
  MomonaCore.loadData("BLHX", BLHXData);
  const logger = ctx.logger("momona-blhx");
  const translate_v2 = new google_translate.v2.Translate();
  const twitterClient = new TwitterApi(cfg.twitter_token);
  const dc_bot = "discord:1089721872255557732";
  const ob_bot = "onebot:3403896494";
  ctx
    .command("blhx <option>", "碧蓝航线转推开关")
    .usage("开关碧蓝航线转推功能，开启后自动转发b博和推特消息")
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
    .command("test <option>", "test", {
      authority: 4,
      hidden: true,
    })
    .action(async ({ session }, option) => {
      const tweets = await twitterClient.v1.userTimelineByUsername(
        "azurlane_staff"
      );
      for (const tweet of tweets) {
        forwardTweet(tweet);
        break;
      }

      // const sent_post = MomonaCore.momona_data["BLHX"].sent_post;
      // const bilibili_data = (
      //   await ctx.http("GET", ctx.config.bilibili_url, {
      //     params: bilibili_params,
      //   })
      // )["data"];

      // return forwardDynamic(bilibili_data["cards"][option || 0]);
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
    // <message forward>
    //   <message>
    //     <author
    //       user-id={onebot.selfId}
    //       nickname="梦梦奈"
    //       avatar={onebot.avatar}
    //     ></author>
    //     {message}
    //   </message>
    // </message>
    onebot.broadcast(
      broadcast_onebot,
      slice(message.message.replace(HTTPREGEX, "")).map((m) => h("message", m))
    );
    onebot.broadcast(
      broadcast_onebot,
      message.images.map((src) => {
        return h.image(src);
      })
    );
    logger.info(`已转发b博${dynamic["desc"]["dynamic_id"]}`);
  }

  // TODO redenr image
  async function renderArticle(url: string) {
    let page: Page;
    try {
      page = await ctx.puppeteer.page();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url);
      await page.waitForNetworkIdle();
      await page.evaluate(() => {});
    } catch (e) {
      throw e;
    } finally {
      page?.close();
    }
  }

  function renderTweet(tweet: TweetV1) {
    const message: string = tweet.full_text;
    let entities;
    if (tweet.extended_entities) {
      entities = tweet.extended_entities;
    } else {
      entities = tweet.entities;
    }
    const images = [];
    if (entities.media) {
      for (const media of entities.media) {
        if (media.type === "photo" && media.media_utl_https) {
          images.push(media.media_utl_https);
        }
      }
    }
    const finalmessage = `${tweet.user.name}发布了新推特：\n${tweet.full_text}`;
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

  async function forwardTweet(tweet: TweetV1) {
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
    // <message forward>
    //   <message>
    //     <author
    //       user-id={onebot.selfId}
    //       nickname="梦梦奈"
    //       avatar={onebot.avatar}
    //     ></author>
    //     {message}
    //   </message>
    //   <message>
    //     <author
    //       user-id={onebot.selfId}
    //       nickname="梦梦奈"
    //       avatar={onebot.avatar}
    //     ></author>
    //     谷歌生草机：{"\n"}
    //     {translated}
    //   </message>
    // </message>
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

    logger.info(`已转发推特${tweet.id}`);
  }

  //推特动态检测定时任务
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

    // 检查推特
    for (const twitter_account of ctx.config.twitter) {
      const sent_tweets = getArrayValue(sent_post.twitter, twitter_account);
      const tweets = await twitterClient.v1.userTimelineByUsername(
        twitter_account,
        { tweet_mode: "extended", count: 5 }
      );
      for (const tweet of tweets) {
        if (!sent_tweets.includes(tweet.id)) {
          sent_tweets.push(tweet.id);
          if (sent_tweets.length > 50) {
            sent_tweets.shift();
          }
          MomonaCore.saveData("BLHX");
          await forwardTweet(tweet);
        }
      }
    }
  });
}
