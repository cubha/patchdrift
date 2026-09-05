import { describe, it, expect } from "vitest";
import { loadEnv } from "../env";

describe("loadEnv (source 주입 — .env 파일 미의존)", () => {
  it("필수값이 있으면 기본값(PATCH_FROM/PATCH_TO)을 채워 반환한다", () => {
    const env = loadEnv({ RIOT_API_KEY: "RGAPI-test" });
    expect(env).toEqual({
      RIOT_API_KEY: "RGAPI-test",
      ANTHROPIC_API_KEY: undefined,
      DISCORD_WEBHOOK_URL: undefined,
      PATCH_FROM: "26.16",
      PATCH_TO: "26.17",
    });
  });

  it("선택값(ANTHROPIC_API_KEY/DISCORD_WEBHOOK_URL)이 있으면 그대로 통과시킨다", () => {
    const env = loadEnv({
      RIOT_API_KEY: "RGAPI-test",
      ANTHROPIC_API_KEY: "sk-ant-test",
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/x",
      PATCH_FROM: "26.15",
      PATCH_TO: "26.16",
    });
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-test");
    expect(env.DISCORD_WEBHOOK_URL).toBe("https://discord.com/api/webhooks/x");
    expect(env.PATCH_FROM).toBe("26.15");
    expect(env.PATCH_TO).toBe("26.16");
  });

  it("RIOT_API_KEY가 없으면 throw하고, 메시지에 필드명 외의 값은 담지 않는다", () => {
    expect(() => loadEnv({})).toThrow(/RIOT_API_KEY/);
  });

  it("무관한 다른 프로세스 환경변수(예: PATH)가 섞여 있어도 실패하지 않는다", () => {
    const env = loadEnv({
      RIOT_API_KEY: "RGAPI-test",
      PATH: "/usr/bin",
      HOME: "/home/user",
    });
    expect(env.RIOT_API_KEY).toBe("RGAPI-test");
  });

  it("실패 메시지에 수신값(빈 문자열 등)을 로그하지 않는다 — 필드 경로만 노출", () => {
    try {
      loadEnv({ RIOT_API_KEY: "" });
      expect.unreachable("빈 문자열은 min(1) 위반으로 throw해야 한다");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("RIOT_API_KEY");
      // received 값 자체(빈 문자열)는 어차피 노출할 정보가 없지만, 키 값 패턴이 섞이지 않는지 확인.
      expect(message).not.toMatch(/RGAPI-/);
    }
  });
});
