---
title: Weekly orders
description: Order volume and paid share by week and weekday.
---
# Weekly orders

Busiest weekday by orders: **{{top_day.day}}** with {{top_day.orders | int}} orders.

```sql by_day "Orders by weekday"
SELECT strftime(created_at, '%a') AS day, isodow(created_at) AS dow, count(*) AS orders,
       count(*) FILTER (WHERE status = 'paid') AS paid
FROM orders GROUP BY ALL ORDER BY dow
```

```sql top_day "Top weekday"
SELECT day, orders FROM by_day ORDER BY orders DESC LIMIT 1
```

```chart
{ type: bar, data: by_day, x: day, y: [orders, paid], title: Orders and paid by weekday }
```
