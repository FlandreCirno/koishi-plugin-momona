import { Context, Random, Schema, Session, h } from "koishi";
import * as MMN from "./momona";
import {} from "@koishijs/plugin-help";
export const name = "momona-dice";

export interface Config {
  max_dice?: number;
  max_roll?: number;
  default_dice?: number;
}

export const Config: Schema<Config> = Schema.object({
  max_dice: Schema.number().default(100000),
  max_roll: Schema.number().default(100),
  default_dice: Schema.number().default(100),
});

export function apply(ctx: Context) {
  ctx
    .command("r <expersion:text>", "随机骰子")
    .shortcut(
      RegExp(`[${(ctx.root.config.prefix as string[]).join("")}]r(.*)`),
      {
        args: ["$1"],
      }
    )
    .example(".rd")
    .example(".r 3d6+6")
    .userFields(["name"])
    .action(({ session }, expersion) => {
      const username = session.user.name || session.username;
      if (!expersion) expersion = "";
      return evaluate(session, expersion, username);
    });

  function evaluate(session: Session, exp: string, username: string) {
    let dice_exp = [];
    let dice_result = [];
    let final_result = 0;
    const list = exp.split("+");
    for (let dice of list) {
      let m = dice.match(dice_reg);

      //有xdx表达式
      if (m) {
        dice_exp.push(m[0]);
        let roll = Number.parseInt(m[1]) || 1;
        let d = Number.parseInt(m[2]) || getDefaultDice();
        if (roll === 0) return session.text("rd_0d");
        if (d === 0) return session.text("rd_d0", [username]);
        if (roll > ctx.config.max_roll) return session.text("rd_toomany");
        if (d > ctx.config.max_roll) return session.text("rd_toolarge");
        if (roll === 1) {
          let random_result = Random.int(1, d + 1);
          dice_result.push(random_result.toString());
          final_result += random_result;
        } else {
          let temp_result = [];
          for (let i = 0; i < roll; i++) {
            let random_result = Random.int(1, d + 1);
            temp_result.push(random_result.toString());
            final_result += random_result;
          }
          dice_result.push("(".concat(temp_result.join("+"), ")"));
        }
      } else {
        //无xdx表达式
        m = dice.match(number_reg);
        if (m) {
          dice_exp.push(m[0]);
          dice_result.push(m[0]);
          final_result += Number.parseInt(m[0]);
        }
      }
    }
    //无结果视为默认骰
    if (dice_exp.length === 0) {
      final_result = Random.int(1, getDefaultDice() + 1);
      dice_exp = ["d".concat(getDefaultDice().toString())];
      dice_result = [final_result.toString()];
    }
    let full_exp;
    if (dice_result.length == 1 && final_result.toString() == dice_result[0]) {
      full_exp = dice_exp.join("+").concat("=").concat(final_result.toString());
    } else {
      full_exp = dice_exp
        .join("+")
        .concat("=")
        .concat(dice_result.join("+"))
        .concat("=")
        .concat(final_result.toString());
    }
    return session.text("rd_result", [username, full_exp]);
  }

  function getDefaultDice() {
    return ctx.config.default_dice;
  }
}

const dice_reg = /(\d*)?d(\d*)?/i;
const number_reg = /\d+/;
