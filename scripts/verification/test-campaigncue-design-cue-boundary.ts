import assert from "node:assert/strict";

import { CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS } from "../../src/constants/campaigncue/designCue";
import {
    cleanDesignCueText,
    getDesignCueDocumentText,
    truncateDesignCueText,
} from "../../src/lib/campaigncue/design-cue/context";
import { resolveCampaignCueDesignCueFreeTextAction } from "../../src/lib/campaigncue/design-cue/intent";
import { validateCampaignCueDesignCuePatchSet } from "../../src/lib/campaigncue/design-cue/validate";

assert.equal(
    resolveCampaignCueDesignCueFreeTextAction("Make this WhatsApp ready"),
    CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_WHATSAPP_READY,
);
assert.equal(
    resolveCampaignCueDesignCueFreeTextAction("Get this ready for print"),
    CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.MAKE_PRINT_READY,
);
assert.equal(
    resolveCampaignCueDesignCueFreeTextAction("Add the WhatsApp number"),
    CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.ADD_WHATSAPP,
);
assert.equal(
    resolveCampaignCueDesignCueFreeTextAction("Resize this poster"),
    CAMPAIGNCUE_DESIGN_CUE_ACTION_IDS.RESIZE_POSTER,
);

let coercionAttempted = false;
const coerciveValue = {
    toString() {
        coercionAttempted = true;
        throw new Error("design cue text must not coerce unknown values");
    },
};
assert.equal(cleanDesignCueText(coerciveValue), "");
assert.equal(resolveCampaignCueDesignCueFreeTextAction(coerciveValue), undefined);
assert.equal(coercionAttempted, false);
assert.equal(truncateDesignCueText("abcdef", 3), "...");
assert.equal(truncateDesignCueText("abcdef", Number.NaN), "");

const hostileElements = new Proxy([], {
    get() {
        throw new Error("document traversal must be contained");
    },
});
assert.equal(getDesignCueDocumentText({ elements: hostileElements } as never), "");
assert.deepEqual(validateCampaignCueDesignCuePatchSet(
    { elements: [] } as never,
    new Proxy({}, {
        get() {
            throw new Error("patch traversal must be contained");
        },
    }) as never,
), { ok: false, error: "Prepared changes are invalid." });
assert.deepEqual(
    validateCampaignCueDesignCuePatchSet(
        { elements: [{ id: "text-1", type: "text" }] } as never,
        {
            operations: [{
                elementId: "text-1",
                op: "update_layer",
                patch: { fontWeight: "900" },
            }],
        } as never,
    ),
    { ok: true, warnings: [] },
    "the runtime validator must accept every font weight allowed by the shared safe-patch type",
);

console.log("CampaignCue Design Cue boundary tests passed.");
