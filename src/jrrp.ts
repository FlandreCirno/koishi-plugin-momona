import { Context, Schema, h } from "koishi";
export const name = "momona-jrrp";

export interface Config {
  endpoint: string;
  proxy: string;
}

export const Config: Schema<Config> = Schema.object({
  endpoint: Schema.string().default("https://api.lolicon.app/setu/v2"),
  proxy: Schema.string().default("setubot-flandrecirno.herokuapp.com"),
});

export function apply(ctx: Context) {
  ctx
    .command("setu [...tags]", "色图")
    .usage("根据Pixiv tag搜索色图")
    .example(".setu 长门")
    .action(({ session }, ...tags) => {
      let r18 = 0;
      let taglist = [];

      for (let i in tags) {
        if (tags[i].toString().toLowerCase() === "r18") {
          r18 = 1;
        } else {
          taglist.push(tags[i].toString());
        }
      }
      console.log(taglist);
      const params = {
        size1200: true,
        proxy: ctx.config.proxy,
        size: ["regular"],
        r18: r18,
        tag: taglist,
      };
      ctx
        .http("POST", ctx.config.endpoint, { data: params })
        .then((response) => {
          if (response["data"] && response["data"].length > 0) {
            let imgurl = response["data"][0]["urls"]["regular"];
            if (session.platform === "discord") {
              session.send(h("image", { url: imgurl }));
            }
          } else {
            session.send(session.text("setu_error"));
          }
        });
    });
}
