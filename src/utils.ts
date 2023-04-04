import { Context, Session, h } from "koishi";
import * as fs from "fs";

export function readJson(path: string) {
  let data = "{}";
  if (fs.existsSync(path)) data = fs.readFileSync(path, "utf8");
  return JSON.parse(data);
}

export function writeJson(path: string, dir: string, data: Object) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path, JSON.stringify(data), "utf8");
}

//给bot开关功能的中间件用的，不拦截bot指令本身
export function commposeBotReg(ctx: Context, selfId: string) {
  // const prefix: string = ctx.root.config.prefix.toString().replace(',', '')
  // const nn: string = ctx.root.config.nickname.toString()
  // const at: string = h('at', {id: selfId})
  return `.*bot.*`;
}

export function isGroup(session: Session) {
  return Boolean(session.channelId);
}

export function isGroupAdmin(session: Session) {
  if (session.platform === "discord") {
    return true;
  } else if (session.platform === "onebot") {
    if (session.subtype === "group") {
      if (session.author.roles.includes("member")) {
        return false;
      }
    }
    return true;
  }
}

export function getValue(obj: object, attr: string) {
  if (obj[attr] === undefined) {
    obj[attr] = {};
  }
  return obj[attr];
}

export function getArrayValue(obj: object, attr: string) {
  if (obj[attr] === undefined) {
    obj[attr] = [];
  }
  return obj[attr];
}
