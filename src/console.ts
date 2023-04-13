import { Context, Schema, h } from "koishi";
import * as Momona from "./momona";
import {} from "@koishijs/plugin-help";
export const name = "momona-console";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  ctx
    .command("eval <expersion:rawtext>", "执行指令中的代码并返回结果", {
      authority: 4,
      hidden: true,
    })
    .action(async ({ session }, expersion) => {
      Momona.Config;
      h("");
      return eval(expersion);
    });
}
