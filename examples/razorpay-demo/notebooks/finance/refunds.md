---
title: Refunds
description: Refund volume and value.
---
# Refunds

{{refund_totals.refunds | int}} refunds worth **{{refund_totals.inr | inr}}**.

```sql refund_totals "Refund totals"
SELECT count(*) AS refunds, coalesce(sum(amount), 0) AS inr FROM refunds
```

```sql refund_method "Refunds by payment method"
SELECT p.method, count(*) AS refunds, sum(r.amount) AS inr
FROM refunds r JOIN payments p ON p.id = r.payment_id
GROUP BY p.method ORDER BY refunds DESC
```

```chart
{ type: pie, data: refund_method, x: method, y: refunds, variant: donut-text, title: Refunds by payment method }
```
