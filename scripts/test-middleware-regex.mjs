const re =
  /^\/((?!_next\/static|_next\/image|favicon\.ico|api\/stripe\/webhook|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)/;
const paths = [
  "/api/stripe/pricing-config",
  "/",
  "/dashboard",
  "/api/stripe/webhook",
  "/foo.png",
  "/api/public/book",
];
for (const p of paths) {
  console.log(p, re.test(p));
}
