<h1 dir="rtl" align="right">راهنمای شناسه‌های بازار</h1>

<p dir="rtl" align="right">
این صفحه شناسه‌هایی را توضیح می‌دهد که در فایل‌های JSON این مخزن استفاده می‌شوند. فهرست کامل و ماشین‌خوان در <a href="https://raw.githubusercontent.com/iran-market/iran-market.github.io/main/data/symbols.json"><code>data/symbols.json</code></a> قرار دارد و هر ۳۰ دقیقه همراه داده‌های قیمت به‌روزرسانی می‌شود. فهرست قطعی تاریخچه‌های منتشرشده، تعداد رکورد و بازهٔ زمانی هرکدام نیز در <a href="https://raw.githubusercontent.com/iran-market/iran-market.github.io/main/data/history/index.json"><code>data/history/index.json</code></a> قرار دارد و روزانه تازه می‌شود.
</p>

<h2 dir="rtl" align="right">شناسه‌های پرکاربرد و بررسی‌شده</h2>

<table dir="rtl" align="right">
  <thead><tr><th align="right">شناسه</th><th align="right">نام نمایش‌داده‌شده در TGJU</th><th align="right">دسته</th><th align="right">قیمت فعلی</th><th align="right">تاریخچهٔ آماده</th></tr></thead>
  <tbody>
    <tr><td><code>USD_IRR_FREE</code></td><td>دلار</td><td>ارز آزاد</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>EUR_IRR_FREE</code></td><td>یورو</td><td>ارز آزاد</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>GBP_IRR_FREE</code></td><td>پوند انگلیس</td><td>ارز آزاد</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>AED_IRR_FREE</code></td><td>درهم امارات</td><td>ارز آزاد</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>GOLD_18K_IRR</code></td><td>طلای ۱۸ عیار</td><td>طلا</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>GOLD_24K_IRR</code></td><td>طلای ۲۴ عیار</td><td>طلا</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>GOLD_USED_IRR</code></td><td>طلای دست دوم</td><td>طلا</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>GOLD_MESGHAL_IRR</code></td><td>مثقال طلا</td><td>طلا</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>XAU_USD</code></td><td>انس طلا</td><td>فلزات جهانی</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>SILVER_999_IRR</code></td><td>گرم نقره ۹۹۹</td><td>فلزات گران‌بها</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>COIN_EMAMI_IRR</code></td><td>سکه امامی</td><td>سکه</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>COIN_BAHAR_IRR</code></td><td>سکه بهار آزادی</td><td>سکه</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>COIN_HALF_IRR</code></td><td>نیم سکه</td><td>سکه</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>COIN_QUARTER_IRR</code></td><td>ربع سکه</td><td>سکه</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>COIN_GRAMI_IRR</code></td><td>سکه گرمی</td><td>سکه</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>USDT_IRR</code></td><td>تتر</td><td>رمزارز ریالی</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>BTC_USD</code></td><td>بیت کوین</td><td>رمزارز</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>ETH_USD</code></td><td>اتریوم</td><td>رمزارز</td><td>دارد</td><td>دارد</td></tr>
    <tr><td><code>BRENT_USD</code></td><td>نفت برنت</td><td>انرژی</td><td>دارد</td><td>دارد</td></tr>
  </tbody>
</table>

<br clear="all">

<h2 dir="rtl" align="right">قواعد نام‌گذاری</h2>

<ul dir="rtl" align="right">
  <li><code>IRR_FREE</code>: نرخ بازار آزاد ایران؛ مقدار فایل <code>latest.json</code> ریال و مقدار <code>latest-toman.json</code> تومان است.</li>
  <li><code>USD</code> در انتهای شناسه: قیمت جهانی بر حسب دلار آمریکا.</li>
  <li><code>COIN_</code>: سکه و <code>GOLD_</code>: طلای داخلی.</li>
  <li><code>has_latest: true</code>: اکنون در فایل قیمت‌های فعلی رکورد دارد.</li>
  <li><code>history_file</code>: اگر مقدار داشته باشد، فایل تاریخچهٔ آمادهٔ همان شناسه است.</li>
  <li><code>data/history/index.json</code>: مرجع ماشین‌خوان برای کشف همهٔ فایل‌های تاریخچه، واحد قیمت، تعداد رکورد و پوشش زمانی آن‌ها.</li>
</ul>

<h2 dir="rtl" align="right">جست‌وجوی برنامه‌نویسی‌شده</h2>

```js
const response = await fetch('https://raw.githubusercontent.com/iran-market/iran-market.github.io/main/data/symbols.json');
const { data } = await response.json();

const usableCurrencies = data.filter(
  (item) => item.category === 'currency' && item.has_latest
);
```

<p dir="rtl" align="right">
شناسه‌ها canonical و متعلق به این مجموعه‌اند؛ slug داخلی منبع داده عمداً به‌عنوان قرارداد عمومی منتشر نمی‌شود. نام‌های جدول بالا در بررسی مستقیم صفحات ارز، طلا، سکه، انرژی و رمزارز TGJU در ۱۰ مهر ۱۴۰۵ تطبیق داده شده‌اند. برای همهٔ موارد دیگر، <code>symbols.json</code> مرجع اصلی است و نام حل‌نشده را به‌جای حدس‌زدن با مقدار <code>null</code> نشان می‌دهد.
</p>
