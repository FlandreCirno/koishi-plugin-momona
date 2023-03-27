import { Context, Schema } from "koishi";
import {} from "@koishijs/plugin-console";

import * as MomonaCore from "./momona";
import * as Console from "./console";
import * as Jrrp from "./jrrp";

export const name = "momona";

export interface Config {
  data_path: string;
}

export const Config: Schema<Config> = Schema.object({
  data_path: Schema.string().default("data"),
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
}
