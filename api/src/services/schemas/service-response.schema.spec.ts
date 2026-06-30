import { ServiceResponseSchema } from "./service-response.schema";

describe("ServiceResponseSchema", () => {
    it("has a unique (serviceId, responderId) index", () => {
        const idx = ServiceResponseSchema.indexes();
        const compound = idx.find(
            ([fields]) => fields.serviceId === 1 && fields.responderId === 1,
        );
        expect(compound).toBeDefined();
        expect(compound?.[1]?.unique).toBe(true);
    });
});
