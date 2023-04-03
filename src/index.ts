import { Context, Schema } from "koishi";
import {} from "@koishijs/plugin-console";

import * as MomonaCore from "./momona";
import * as Manage from "./manage";
import * as Console from "./console";
import * as Jrrp from "./jrrp";
import * as Dice from "./dice";
import * as BLHX from "./blhx";

export const name = "momona";
//export const using = ["cron", "puppeteer"] as const;

export interface Config {
  data_path: string;
  twitter_token: string;
  twitter: Array<string>;
  bilibili_url: string;
}

export const Config: Schema<Config> = Schema.object({
  data_path: Schema.string().default("data"),
  twitter_token: Schema.string(),
  twitter: Schema.array(Schema.string()).default([
    "azurlane_staff",
    "AzurLane_EN",
  ]),
  bilibili_url: Schema.string().default(
    "https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history"
  ),
});

const config = new Config();

export function apply(ctx: Context, cfg: Config) {
  // ctx.using(['console'], (ctx) => {
  //   ctx.console.addEntry({
  //     dev: resolve(__dirname, '../client/index.ts'),
  //     prod: resolve(__dirname, '../dist'),
  //   })
  // })
  ctx.i18n.define("zh", require("./locales/Momona"));
  ctx.plugin(MomonaCore);
  ctx.plugin(Console);
  ctx.plugin(Jrrp);
  ctx.plugin(Dice);
  ctx.plugin(Manage);
  ctx.plugin(BLHX, BLHX.Config(cfg));
}
