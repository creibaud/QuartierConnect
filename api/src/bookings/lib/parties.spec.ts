import { resolveParties } from "./parties";

describe("resolveParties", () => {
    it("offer: initiator pays the owner", () => {
        expect(resolveParties("offer", "owner", "initiator")).toEqual({
            payerId: "initiator",
            payeeId: "owner",
        });
    });
    it("request: owner pays the initiator (the helper)", () => {
        expect(resolveParties("request", "owner", "initiator")).toEqual({
            payerId: "owner",
            payeeId: "initiator",
        });
    });
});
