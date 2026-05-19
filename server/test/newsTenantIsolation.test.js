import assert from "assert";
import test from "node:test";
import {
  buildNewsListFilter,
  buildNewsTenantMutationFilter,
} from "../src/modules/news/news.service.js";

const companyA = "111111111111111111111111";
const companyB = "222222222222222222222222";
const newsA = "aaaaaaaaaaaaaaaaaaaaaaaa";

test("Company A news list filter cannot see Company B news", () => {
  const filter = buildNewsListFilter({ role: "USER", companyId: companyA });

  assert.deepEqual(filter, { status: "published", companyId: companyA });
  assert.notEqual(String(filter.companyId), companyB);
});

test("Company B mark/view/update/delete filters cannot target Company A news", () => {
  const filter = buildNewsTenantMutationFilter(newsA, { role: "HR", companyId: companyB });

  assert.deepEqual(filter, { _id: newsA, companyId: companyB });
  assert.notEqual(String(filter.companyId), companyA);
});

test("ADMIN and HR mutations are scoped to their own company", () => {
  for (const role of ["ADMIN", "HR"]) {
    const filter = buildNewsTenantMutationFilter(newsA, { role, companyId: companyA });
    assert.equal(String(filter.companyId), companyA);
  }
});

test("SUPERADMIN can list all news or filter by selected company", () => {
  assert.deepEqual(buildNewsListFilter({ role: "SUPERADMIN" }), { status: "published" });

  assert.deepEqual(
    buildNewsListFilter({ role: "SUPERADMIN" }, companyB),
    { status: "published", companyId: companyB }
  );
});

test("SUPERADMIN mutations require an explicit company scope", () => {
  assert.throws(
    () => buildNewsTenantMutationFilter(newsA, { role: "SUPERADMIN" }),
    /Company context is required/
  );

  assert.deepEqual(
    buildNewsTenantMutationFilter(newsA, { role: "SUPERADMIN" }, companyA),
    { _id: newsA, companyId: companyA }
  );
});
