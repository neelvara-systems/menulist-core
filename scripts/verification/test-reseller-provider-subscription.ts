import assert from "node:assert/strict";
import {
    projectResellerProviderSubscription,
} from "../../src/lib/reseller/resellerProviderSubscription";

assert.deepEqual(projectResellerProviderSubscription({
    id: "sub_Qa123",
    short_url: "https://rzp.io/i/example123",
}), {
    checkoutUrl: "https://rzp.io/i/example123",
    id: "sub_Qa123",
});
assert.equal(projectResellerProviderSubscription({
    id: "",
    short_url: "https://rzp.io/i/example123",
}), null);
assert.equal(projectResellerProviderSubscription({
    id: "sub/foreign",
    short_url: "https://rzp.io/i/example123",
}), null);
assert.equal(projectResellerProviderSubscription({
    id: "sub_Qa123",
    short_url: "https://example.test/not-razorpay",
}), null);
assert.equal(projectResellerProviderSubscription({
    id: 123,
    short_url: "https://rzp.io/i/example123",
}), null);

console.log("Reseller provider subscription boundary tests passed.");
