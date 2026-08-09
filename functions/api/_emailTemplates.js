// Email HTML templates for GCTracker
// All templates use inline styles + table layout for email-client compatibility
// (Gmail/Outlook strip <style> blocks and don't support flexbox/grid).
//
// Imported by subscribe.js. Keep this file pure (no side effects).

// ---- Helpers ----

// Simplified→Traditional character map covering this template's copy. Applied as a
// final pass over subject/html/text when language==='tw'; tw notice translations are
// already traditional and pass through untouched (map keys are simplified-only).
const S2T = {'签':'簽','证':'證','进':'進','这':'這','个':'個','于':'於','后':'後','还':'還','递':'遞','优':'優','类':'類','别':'別','预':'預','计':'計','从':'從','时':'時','间':'間','变':'變','无':'無','动':'動','说':'說','条':'條','与':'與','获':'獲','历':'歷','现':'現','线':'線','图':'圖','数':'數','据':'據','来':'來','实':'實','际':'際','过':'過','单':'單','为':'為','转':'轉','较':'較','远':'遠','运':'運','适':'適','选':'選','邮':'郵','里':'裡','错':'錯','长':'長','门':'門','问':'問','阅':'閱','队':'隊','阶':'階','随':'隨','难':'難','页':'頁','项':'項','须':'須','题':'題','额':'額','验':'驗','点':'點','热':'熱','状':'狀','监':'監','确':'確','码':'碼','稳':'穩','简':'簡','纪':'紀','约':'約','级':'級','纳':'納','组':'組','细':'細','终':'終','经':'經','结':'結','给':'給','统':'統','继':'繼','续':'續','维':'維','绿':'綠','缓':'緩','编':'編','缩':'縮','网':'網','义':'義','职':'職','联':'聯','脑':'腦','范':'範','处':'處','号':'號','补':'補','规':'規','视':'視','览':'覽','觉':'覺','观':'觀','订':'訂','认':'認','讨':'討','让':'讓','议':'議','记':'記','许':'許','论':'論','设':'設','访':'訪','评':'評','识':'識','诉':'訴','词':'詞','译':'譯','试':'試','话':'話','询':'詢','该':'該','详':'詳','语':'語','误':'誤','请':'請','读':'讀','调':'調','谢':'謝','负':'負','败':'敗','货':'貨','质':'質','贴':'貼','费':'費','资':'資','赖':'賴','赶':'趕','输':'輸','办':'辦','务':'務','劳':'勞','势':'勢','区':'區','医':'醫','升':'升','卫':'衛','厂':'廠','厅':'廳','压':'壓','县':'縣','发':'發','只':'只','吗':'嗎','启':'啟','员':'員','周':'週','咨':'諮','响':'響','国':'國','圆':'圓','团':'團','园':'園','围':'圍','坏':'壞','块':'塊','声':'聲','复':'復','够':'夠','头':'頭','夹':'夾','奖':'獎','妈':'媽','宝':'寶','审':'審','宽':'寬','寻':'尋','对':'對','导':'導','届':'屆','属':'屬','岁':'歲','岛':'島','币':'幣','师':'師','帮':'幫','干':'幹','并':'並','广':'廣','庆':'慶','应':'應','废':'廢','开':'開','异':'異','弃':'棄','张':'張','弹':'彈','当':'當','录':'錄','彻':'徹','径':'徑','忆':'憶','态':'態','总':'總','恶':'惡','惊':'驚','惯':'慣','愿':'願','战':'戰','户':'戶','执':'執','扩':'擴','扬':'揚','抢':'搶','护':'護','报':'報','担':'擔','拟':'擬','拥':'擁','择':'擇','挂':'掛','挡':'擋','挥':'揮','损':'損','换':'換','摆':'擺','敌':'敵','断':'斷','旧':'舊','显':'顯','暂':'暫','术':'術','权':'權','构':'構','标':'標','栏':'欄','树':'樹','样':'樣','档':'檔','桥':'橋','检':'檢','楼':'樓','极':'極','汇':'匯','汉':'漢','沟':'溝','没':'沒','泽':'澤','洁':'潔','测':'測','济':'濟','浅':'淺','涨':'漲','渐':'漸','温':'溫','湾':'灣','满':'滿','滚':'滾','滞':'滯','灯':'燈','灵':'靈','灾':'災','烦':'煩','爱':'愛','牵':'牽','独':'獨','环':'環','玛':'瑪','础':'礎','离':'離','种':'種','积':'積','称':'稱','稣':'穌','穷':'窮','竞':'競','笔':'筆','紧':'緊','纯':'純','删':'刪','则':'則','刚':'剛','创':'創','剧':'劇','写':'寫','军':'軍','农':'農','冲':'衝','决':'決','况':'況','冻':'凍','净':'淨','准':'準','减':'減','几':'幾','击':'擊','凤':'鳳','凭':'憑','儿':'兒','亿':'億','仅':'僅','们':'們','价':'價','众':'眾','伙':'夥','会':'會','伟':'偉','传':'傳','伤':'傷','伦':'倫','体':'體','余':'餘','债':'債','倾':'傾','兰':'蘭','关':'關','兴':'興','养':'養','内':'內','册':'冊','骗':'騙','丢':'丟','两':'兩','严':'嚴','丧':'喪','丰':'豐','临':'臨','丽':'麗','举':'舉','么':'麼','乌':'烏','乐':'樂','习':'習','乡':'鄉','书':'書','买':'買','乱':'亂','争':'爭','亏':'虧','云':'雲','亚':'亞','产':'產','亲':'親','轨':'軌','迟':'遲','连':'連','速':'速','退':'退','逐':'逐','移':'移','程':'程','稍':'稍','份':'份','低':'低','估':'估','依':'依','保':'保','信':'信','修':'修','假':'假','做':'做','停':'停','偏':'偏','偶':'偶','储':'儲','光':'光','免':'免','入':'入','全':'全','公':'公','共':'共','其':'其','典':'典','兼':'兼','再':'再','写':'寫','冠':'冠','准':'準','凑':'湊','出':'出','击':'擊','分':'分','切':'切','列':'列','初':'初','判':'判','利':'利','到':'到','前':'前','剩':'剩','割':'割','力':'力','加':'加','劣':'劣','动':'動','助':'助','努':'努','勇':'勇','包':'包','化':'化','匀':'勻','半':'半','协':'協','占':'占','卡':'卡','危':'危','即':'即','原':'原','去':'去','县':'縣','参':'參','双':'雙','收':'收','改':'改','放':'放','政':'政','故':'故','敏':'敏','救':'救','教':'教','散':'散','整':'整','文':'文','斯':'斯','新':'新','方':'方','旅':'旅','日':'日','早':'早','明':'明','昨':'昨','是':'是','晚':'晚','景':'景','晴':'晴','智':'智','曲':'曲','更':'更','曾':'曾','最':'最','月':'月','有':'有','期':'期','木':'木','未':'未','末':'末','本':'本','朱':'朱','材':'材','村':'村','束':'束','步':'步','段':'段','每':'每','比':'比','毕':'畢','水':'水','求':'求','江':'江','池':'池','决':'決','法':'法','注':'注','洋':'洋','洞':'洞','活':'活','流':'流','浪':'浪','海':'海','消':'消','深':'深','清':'清','港':'港','游':'遊','源':'源','溢':'溢','演':'演','点':'點','然':'然','照':'照','熟':'熟','片':'片','版':'版','牌':'牌','物':'物','特':'特','状':'狀','率':'率','王':'王','班':'班','球':'球','理':'理','生':'生','用':'用','由':'由','电':'電','界':'界','留':'留','略':'略','番':'番','疑':'疑','病':'病','登':'登','百':'百','的':'的','皮':'皮','益':'益','盛':'盛','目':'目','直':'直','相':'相','省':'省','看':'看','真':'真','眼':'眼','着':'著','知':'知','短':'短','石':'石','破':'破','示':'示','礼':'禮','社':'社','祝':'祝','神':'神','票':'票','福':'福','秀':'秀','私':'私','秋':'秋','科':'科','秒':'秒','秘':'祕','究':'究','空':'空','突':'突','窗':'窗','立':'立','站':'站','端':'端','符':'符','第':'第','等':'等','策':'策','答':'答','篇':'篇','米':'米','精':'精','素':'素','索':'索','紫':'紫','累':'累','红':'紅','纷':'紛','绍':'紹','绕':'繞','络':'絡','绝':'絕','绩':'績','置':'置','美':'美','群':'群','考':'考','者':'者','而':'而','耐':'耐','聊':'聊','聚':'聚','肉':'肉','肯':'肯','育':'育','背':'背','能':'能','脚':'腳','腾':'騰','自':'自','至':'至','致':'致','舍':'捨','良':'良','色':'色','艺':'藝','节':'節','花':'花','若':'若','英':'英','荐':'薦','荣':'榮','药':'藥','莫':'莫','菜':'菜','营':'營','落':'落','著':'著','蓝':'藍','虑':'慮','虽':'雖','蚀':'蝕','行':'行','街':'街','衡':'衡','衣':'衣','装':'裝','西':'西','要':'要','见':'見','角':'角','解':'解','触':'觸','言':'言','警':'警','贝':'貝','贡':'貢','败':'敗','账':'帳','贯':'貫','购':'購','贵':'貴','赞':'讚','走':'走','起':'起','超':'超','越':'越','跃':'躍','距':'距','跟':'跟','路':'路','跳':'跳','身':'身','躲':'躲','车':'車','软':'軟','轻':'輕','载':'載','辑':'輯','辞':'辭','辖':'轄','边':'邊','达':'達','迁':'遷','迎':'迎','近':'近','返':'返','违':'違','迷':'迷','追':'追','逻':'邏','部':'部','都':'都','酬':'酬','采':'採','释':'釋','重':'重','量':'量','金':'金','针':'針','钟':'鐘','钱':'錢','铁':'鐵','银':'銀','销':'銷','锁':'鎖','镜':'鏡','闭':'閉','闲':'閒','阵':'陣','陆':'陸','除':'除','险':'險','隐':'隱','雅':'雅','集':'集','雨':'雨','零':'零','雾':'霧','需':'需','静':'靜','非':'非','面':'面','音':'音','顺':'順','顾':'顧','频':'頻','颗':'顆','风':'風','飞':'飛','食':'食','餐':'餐','馆':'館','首':'首','香':'香','马':'馬','驱':'驅','骂':'罵','高':'高','鲜':'鮮','鸟':'鳥','麻':'麻','黄':'黃','黑':'黑','默':'默','鼓':'鼓','龄':'齡'};
const toTraditional = (str) => str.replace(/[\u4e00-\u9fff]/g, (c) => S2T[c] || c);

const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Shared <head> for every outgoing email. One copy so client fixes (color-scheme
// pinning, mobile padding, headline scaling) land in all templates at once — the
// per-template copies had already drifted (color-scheme existed in only one).
const emailHead = (subject) => `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
  a { text-decoration: none; }
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .headline { font-size: 22px !important; }
  }
</style>
</head>`;

// Map category/country codes to display labels
const formatCategory = (cat) => {
  if (!cat) return '—';
  const map = {
    'EB1': 'EB-1',
    'EB2': 'EB-2',
    'EB3': 'EB-3',
    'EW': 'EB-3 Other Workers',
    'EB4': 'EB-4 Special Immigrants',
    'SR': 'EB-4 Religious Workers (SR)',
    'EB5': 'EB-5 Investors (Unreserved)',
    'EB4': 'EB-4',
    'EB5': 'EB-5',
    'F1': 'F1',
    'F2A': 'F2A',
    'F2B': 'F2B',
    'F3': 'F3',
    'F4': 'F4',
  };
  return map[cat] || cat;
};

const formatCountry = (country) => {
  if (!country) return '—';
  // Subscriber records store the App's own country strings ('China', 'Taiwan', …) —
  // 'Taiwan' is the App's key for the ROW/HK/TW/Macao pool, so it must NOT display as
  // bare "Taiwan". The 3-letter codes are kept as aliases for any legacy record.
  const map = {
    'China': 'China · 中国', 'CHN': 'China · 中国',
    'India': 'India · 印度', 'IND': 'India · 印度',
    'Mexico': 'Mexico · 墨西哥', 'MEX': 'Mexico · 墨西哥',
    'Philippines': 'Philippines · 菲律宾', 'PHL': 'Philippines · 菲律宾',
    'Taiwan': 'ROW · 全球/港澳台', 'ROW': 'ROW · 全球/港澳台',
  };
  return map[country] || country;
};

const formatAlerts = (alerts, lang) => {
  if (!alerts || typeof alerts !== 'object') return lang === 'en' ? 'Monthly updates' : '月度更新';
  const labels = lang === 'en'
    ? { whenCurrent: 'When current', whenEligible: 'When eligible to file', monthlyUpdates: 'Monthly updates', retrogression: 'Retrogression alerts' }
    : { whenCurrent: '当前', whenEligible: '可递件', monthlyUpdates: '月度更新', retrogression: '倒退提醒' };
  const enabled = Object.keys(alerts).filter((k) => alerts[k]).map((k) => labels[k]).filter(Boolean);
  if (enabled.length === 0) return lang === 'en' ? 'Monthly updates' : '月度更新';
  return enabled.join(' · ');
};

// Get translated copy for a given language
const getCopy = (lang) => {
  if (lang === 'en') {
    return {
      preheader: 'Your subscription is confirmed. We\'ll watch the bulletin so you don\'t have to.',
      volTag: 'Vol. I · Bulletin',
      brandLineEn: 'Green Card Tracker · Subscriber Confirmation',
      brandTitle: 'Green Card Tracker',
      eyebrow: '— Subscription Confirmed —',
      headline: 'Your priority date is being watched',
      lede: 'Thanks for subscribing. We\'ll email you the moment the State Department releases a new Visa Bulletin and your category moves — so you won\'t miss it.',
      caseHeader: 'Your Case',
      labelCategory: 'Category',
      labelCountry: 'Country of Birth',
      labelPriorityDate: 'Priority Date',
      labelAlerts: 'Alerts',
      stepsHeader: 'What happens next',
      // Mid-month, not "8th–15th": Wayback snapshots of every recent bulletin put the
      // real release days at the 12th–22nd (that's also why the scraper watches 10–23).
      step1: 'Each month around mid-month (roughly the 12th–22nd), the State Department releases the new Visa Bulletin.',
      step2: 'We scrape it and compare against last month for your specific category.',
      step3: 'If your category moves → we email you with the change and what it means.',
      step4: 'If nothing moves → we stay quiet. You can change settings anytime.',
      ctaButton: 'Open Green Card Tracker →',
      footerWhy: 'You received this because you subscribed at',
      footerUnsub: 'Unsubscribe',
      footerSettings: 'Edit preferences',
      footerSource: 'Data: travel.state.gov',
      footerBrand: 'Green Card Tracker · JMJ · 2026',
    };
  }
  // default zh
  return {
    preheader: '订阅成功。每月排期变化我们会第一时间通知你。',
    volTag: 'Vol. I · Bulletin',
    brandLineEn: 'Green Card Tracker · Subscriber Confirmation',
    brandTitle: '绿卡晴雨表',
    eyebrow: '— 订阅成功 —',
    headline: '你的排期，正在被守望',
    lede: '感谢订阅。我们会在每月 Visa Bulletin 发布、且<b>你的类别</b>出现变化时，第一时间发邮件提醒你 — 不刷小红书也不会错过排期前进或倒退。',
    caseHeader: '你的案子 · Your Case',
    labelCategory: '类别',
    labelCountry: '出生国',
    labelPriorityDate: '优先日',
    labelAlerts: '提醒类型',
    stepsHeader: '接下来 · What happens next',
    step1: '每月中旬（约 12–22 号），国务院发布最新 Visa Bulletin。',
    step2: '我们抓取数据，对比上月你类别的排期变化。',
    step3: '有变化 → 给你发邮件，内含变化幅度 + 影响分析。',
    step4: '无变化 → 我们不打扰你（你可以在产品里改设置）。',
    ctaButton: '打开绿卡晴雨表 →',
    footerWhy: '你收到这封邮件，是因为你订阅了排期提醒，订阅地址：',
    footerUnsub: '取消订阅',
    footerSettings: '修改设置',
    footerSource: '数据来源：travel.state.gov',
    footerBrand: 'Green Card Tracker · JMJ · 2026',
  };
};

// ---- Welcome Email Template ----

export const renderWelcomeEmail = ({ email, userCase, alerts, language, siteUrl, unsubscribeUrl }) => {
  const lang = language === 'en' ? 'en' : 'zh';
  const t = getCopy(lang);

  const category = formatCategory(userCase?.category);
  const country = formatCountry(userCase?.country);
  const priorityDate = escapeHtml(userCase?.priorityDate) || '—';
  const alertsLine = formatAlerts(alerts, lang);
  // Same deep link the monthly email uses — lands the subscriber on their own case,
  // not the first-run picker.
  const caseUrl = buildCaseUrl(siteUrl, userCase);

  const subject = lang === 'en'
    ? 'Welcome to Green Card Tracker — your priority date is being watched'
    : '欢迎订阅绿卡晴雨表 — 你的排期正在被守望';

  // Plain text version (for clients that don't render HTML, and better deliverability)
  const text = lang === 'en'
    ? `${t.headline}

${t.lede.replace(/<[^>]+>/g, '')}

YOUR CASE
Category: ${category}
Country: ${country}
Priority Date: ${priorityDate}
Alerts: ${alertsLine}

WHAT HAPPENS NEXT
1. Each month around mid-month (roughly the 12th-22nd), State Department releases the new Visa Bulletin.
2. We scrape it and compare against last month for your category.
3. If your category moves, we email you.
4. If nothing moves, we stay quiet.

Open the app: ${caseUrl}
Unsubscribe: ${unsubscribeUrl}

Green Card Tracker · JMJ · 2026
Data source: travel.state.gov`
    : `${t.headline}

感谢订阅。我们会在每月 Visa Bulletin 发布、且你的类别出现变化时，第一时间发邮件提醒你。

你的案子
类别: ${category}
出生国: ${country}
优先日: ${priorityDate}
提醒: ${alertsLine}

接下来
1. 每月中旬（约 12–22 号），国务院发布最新 Visa Bulletin。
2. 我们抓取数据，对比上月你类别的排期变化。
3. 有变化 → 给你发邮件。
4. 无变化 → 我们不打扰你。

打开应用: ${caseUrl}
取消订阅: ${unsubscribeUrl}

绿卡晴雨表 · JMJ · 2026
数据来源：travel.state.gov`;

  // HTML version - table-based layout for email client compatibility
  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead(subject)}
<body class="email-bg" style="margin:0; padding:0; background:#f4f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a;">

<!-- Preheader (hidden, shows in inbox preview) -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(t.preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ee;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background:#fdfcf8; border:1px solid #d4d2c8;">

        <!-- Masthead -->
        <tr>
          <td class="px" style="padding:32px 40px 20px; border-bottom:1px solid #1a1a1a;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Georgia,serif; font-size:22px; font-weight:500; letter-spacing:-0.01em; color:#1a1a1a;">${escapeHtml(t.brandTitle)}</td>
                <td align="right" style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.1em; color:#6b6a64; text-transform:uppercase;">${t.volTag}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Eyebrow + headline + lede -->
        <tr>
          <td class="px" style="padding:28px 40px 8px;">
            <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#8b3a3a; text-transform:uppercase; margin-bottom:8px;">${t.eyebrow}</div>
            <div class="headline" style="font-family:Georgia,serif; font-size:26px; line-height:1.25; font-weight:400; letter-spacing:-0.01em; margin-bottom:16px; color:#1a1a1a;">${escapeHtml(t.headline)}</div>
            <div style="font-size:14px; line-height:1.7; color:#2a2a2a;">${t.lede}</div>
          </td>
        </tr>

        <!-- Your case block -->
        <tr>
          <td class="px" style="padding:24px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL_BG}; border:1px solid ${PANEL_BORDER}; border-left:2px solid #1a1a1a;">
              <tr>
                <td style="padding:16px 18px;">
                  <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:10px;">${escapeHtml(t.caseHeader)}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;">
                    <tr>
                      <td style="padding:3px 0; color:#6b6a64;">${escapeHtml(t.labelCategory)}</td>
                      <td align="right" style="padding:3px 0; font-family:'Courier New',monospace; color:#1a1a1a;">${escapeHtml(category)}</td>
                    </tr>
                    <tr>
                      <td style="padding:3px 0; color:#6b6a64;">${escapeHtml(t.labelCountry)}</td>
                      <td align="right" style="padding:3px 0; font-family:'Courier New',monospace; color:#1a1a1a;">${escapeHtml(country)}${countryFlagHtml(userCase?.country)}</td>
                    </tr>
                    <tr>
                      <td style="padding:3px 0; color:#6b6a64;">${escapeHtml(t.labelPriorityDate)}</td>
                      <td align="right" style="padding:3px 0; font-family:'Courier New',monospace; color:#1a1a1a;">${priorityDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:3px 0; color:#6b6a64;">${escapeHtml(t.labelAlerts)}</td>
                      <td align="right" style="padding:3px 0; font-size:12px; color:#1a1a1a;">${escapeHtml(alertsLine)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- What happens next -->
        <tr>
          <td class="px" style="padding:0 40px 8px;">
            <div style="border-top:1px solid #d4d2c8; padding-top:18px;">
              <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:12px;">${escapeHtml(t.stepsHeader)}</div>
              <div style="font-size:13px; line-height:1.75; color:#2a2a2a;">
                <p style="margin:0 0 10px;"><span style="font-family:'Courier New',monospace; font-size:11px; font-weight:500;">01.</span>&nbsp;&nbsp;${escapeHtml(t.step1)}</p>
                <p style="margin:0 0 10px;"><span style="font-family:'Courier New',monospace; font-size:11px; font-weight:500;">02.</span>&nbsp;&nbsp;${escapeHtml(t.step2)}</p>
                <p style="margin:0 0 10px;"><span style="font-family:'Courier New',monospace; font-size:11px; font-weight:500;">03.</span>&nbsp;&nbsp;${escapeHtml(t.step3)}</p>
                <p style="margin:0;"><span style="font-family:'Courier New',monospace; font-size:11px; font-weight:500;">04.</span>&nbsp;&nbsp;${escapeHtml(t.step4)}</p>
              </div>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" class="px" style="padding:24px 40px;">
            <a href="${escapeHtml(caseUrl)}" style="display:inline-block; background:#1a1a1a; color:#fdfcf8; padding:11px 28px; text-decoration:none; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(t.ctaButton)}</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" class="px" style="padding:16px 40px 24px; border-top:1px solid #d4d2c8;">
            <div style="font-size:10px; color:#8a8980; line-height:1.7;">
              ${escapeHtml(t.footerWhy)} <a href="${escapeHtml(siteUrl)}" style="color:#6b6a64;">gc.jmjvc.us</a>.<br>
              <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b6a64;">${escapeHtml(t.footerUnsub)}</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(siteUrl)}" style="color:#6b6a64;">${escapeHtml(t.footerSettings)}</a>
              &nbsp;·&nbsp;
              ${escapeHtml(t.footerSource)}
            </div>
            <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#b0afa6; text-transform:uppercase; margin-top:14px;">${escapeHtml(t.footerBrand)}</div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

  if (language === 'tw') {
    return { subject: toTraditional(subject), html: toTraditional(html), text: toTraditional(text) };
  }
  return { subject, html, text };
};

// ---- Unsubscribe Confirmation Page (HTML, served by /api/unsubscribe) ----

export const renderUnsubscribePage = ({ email, success, language }) => {
  const lang = language === 'en' ? 'en' : 'zh';

  const titles = {
    zh: { ok: '已取消订阅', fail: '取消订阅失败' },
    en: { ok: 'Unsubscribed', fail: 'Unsubscribe failed' },
  };
  const messages = {
    zh: {
      ok: `${escapeHtml(email)} 已从订阅列表中移除。你不会再收到来自绿卡晴雨表的邮件。`,
      fail: '我们没能完成你的取消订阅请求。请重试，或在产品里手动取消。',
    },
    en: {
      ok: `${escapeHtml(email)} has been removed from our list. You will not receive further emails from Green Card Tracker.`,
      fail: 'We could not complete your unsubscribe request. Please try again or unsubscribe from inside the app.',
    },
  };
  const buttonLabels = { zh: '返回绿卡晴雨表', en: 'Back to Green Card Tracker' };

  const title = success ? titles[lang].ok : titles[lang].fail;
  const message = success ? messages[lang].ok : messages[lang].fail;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · Green Card Tracker</title>
<style>
  body { margin:0; padding:0; background:#f4f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { background:#fdfcf8; border:1px solid #d4d2c8; max-width:480px; width:100%; padding:40px; }
  .eyebrow { font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:${success ? '#6b6a64' : '#8b3a3a'}; text-transform:uppercase; margin-bottom:12px; }
  h1 { font-family:Georgia,serif; font-size:24px; font-weight:400; letter-spacing:-0.01em; margin:0 0 16px; }
  p { font-size:14px; line-height:1.7; color:#2a2a2a; margin:0 0 24px; }
  a.btn { display:inline-block; background:#1a1a1a; color:#fdfcf8; padding:11px 24px; text-decoration:none; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; font-family:-apple-system,sans-serif; }
  .brand { font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#b0afa6; text-transform:uppercase; margin-top:32px; padding-top:16px; border-top:1px solid #d4d2c8; }
</style>
</head>
<body>
<div class="card">
  <div class="eyebrow">— ${success ? (lang === 'en' ? 'Confirmed' : '已确认') : (lang === 'en' ? 'Error' : '出错了')} —</div>
  <h1>${escapeHtml(title)}</h1>
  <p>${message}</p>
  <a class="btn" href="https://gc.jmjvc.us">${escapeHtml(buttonLabels[lang])} →</a>
  <div class="brand">Green Card Tracker · JMJ · 2026</div>
</div>
</body>
</html>`;
};

// ---- Monthly Bulletin Update Email ----
// Sent when a new Visa Bulletin is scraped and a confirmed subscriber's own
// category/country moved (advanced, retrogressed, or became current). Personalized
// per-case: shows this month's Final Action + Filing Date movement for the subscriber's
// exact case, and (when still not current) a hybrid-model ETA to their priority date.
// `update` is the shape returned by computeCaseUpdate() in scripts/lib/gcMath.mjs.

// Cutoff dates render as raw YYYY-MM-DD in monospace — short, alignment-stable,
// and consistent with how the priority date is shown. Only C/U get words.
const formatDateForLang = (s, lang) => {
  // null IS the bulletin's U (scraper contract) — "无"/"N/A" read as missing data.
  if (!s || s === 'U') return lang === 'en' ? 'Unavailable (U)' : '无名额（U）';
  if (s === 'C') return lang === 'en' ? 'Current' : '无排期';
  return s;
};

const formatMonthsForLang = (months, lang) => {
  if (months === null || months === undefined) return lang === 'en' ? 'beyond our forecast horizon' : '超出预测范围';
  if (months <= 0) return lang === 'en' ? 'already current' : '已经排到';
  const years = months / 12;
  if (lang === 'en') {
    return years >= 1.5
      ? `about ${years.toFixed(1)} years (${Math.round(months)} months)`
      : `about ${Math.round(months)} months`;
  }
  return years >= 1.5
    ? `约 ${years.toFixed(1)} 年（${Math.round(months)} 个月）`
    : `约 ${Math.round(months)} 个月`;
};

// Bare form for the two ends of a range, where a repeated "about" reads as noise.
const formatMonthsCompact = (months, lang) => {
  if (months === null || months === undefined) return lang === 'en' ? '10+ yrs' : '10 年以上';
  if (months <= 0) return lang === 'en' ? 'now' : '已排到';
  const years = months / 12;
  if (years >= 1.5) return lang === 'en' ? `${years.toFixed(1)} yrs` : `${years.toFixed(1)} 年`;
  return lang === 'en' ? `${Math.round(months)} mo` : `${Math.round(months)} 个月`;
};

const movementCopy = (movement, lang) => {
  const t = {
    zh: { advanced: '前进', retrogressed: '倒退', current: '变为无排期（Current）', none: '无变化' },
    en: { advanced: 'advanced', retrogressed: 'retrogressed', current: 'became Current', none: 'no change' },
  }[lang];
  if (movement.type === 'advanced') return lang === 'en' ? `advanced ${movement.days} days` : `前进 ${movement.days} 天`;
  if (movement.type === 'retrogressed') return lang === 'en' ? `retrogressed ${movement.days ?? ''} days`.trim() : `倒退 ${movement.days ?? ''} 天`.trim();
  if (movement.type === 'current') return t.current;
  if (movement.type === 'unavailable') return movement.still
    ? (lang === 'en' ? 'still unavailable (U)' : '持续无名额（U）')
    : (lang === 'en' ? 'went unavailable (U)' : '转为无名额（U）');
  if (movement.type === 'resumed') return lang === 'en' ? 'resumed' : '恢复名额';
  return t.none;
};

// Monthly-movement column chart, drawn with table cells and background colors.
// Deliberately not SVG or a hosted PNG: Gmail strips inline <svg>, Outlook's Word
// renderer never supported it, and remote images are blocked by default in several
// clients — a background-color <div> inside a <td> is the one thing that renders
// everywhere. No hover layer exists because email has no JS, so every fact the
// tooltip would carry is either direct-labeled or stated in the caption below.
//
// Colors are the CVD-validated pair (#0d7cb5 / #c1571f, ΔE 20.8 under protanopia);
// a red/green pair fails at ΔE 2.0. Bar direction and the signed label carry the
// same distinction, so color is never the sole encoder.
const ADVANCE_COLOR = '#0d7cb5';
const RETROGRESS_COLOR = '#c1571f';
const ZERO_COLOR = '#d4d2c8';
const TREND_FILL = '#cfe3ef'; // light tint of ADVANCE_COLOR for the trend chart's area
// Cumulative-total green. Validated with the pair above in true adjacency order
// (rust↔blue↔green): worst pair ΔE 17.4 under deutan. Rust and green never touch —
// retrogression hangs below the baseline, the cumulative column sits behind a divider.
const CUMULATIVE_COLOR = '#0e6b3e';
// Chart panel surface — the tinted card the charts sit on. Stacked-segment gaps and
// mark spacers must use this, not the page background, or gaps read as stray lines.
const PANEL_BG = '#f7f5ee';
const PANEL_BORDER = '#e4e1d6';

// Flat rectangular flags mirroring the site's CountryFlag SVGs — NOT emoji (the user
// wants the site's crisp non-waving flags, and emoji flags render as waving art on iOS
// and as bare letter pairs on Windows). SVG dies in Gmail, so these are the same
// background-color-block technique as the charts: stacked/joined divs, 21×14px, 1px
// outline so white stripes survive the cream surface. Outlook's Word engine can't do
// inline-block, so the whole flag is wrapped in a non-mso conditional — Outlook simply
// shows no flag rather than a broken one.
const countryFlagHtml = (country, k = 1) => {
  // k = integer scale. k=1 (30×20) rides inline with text; k=2 (60×40) is the case
  // card's standalone flag, big enough for the five-star arc to read clearly.
  const W = 30 * k, H = 20 * k;
  const box = (inner, extra = '') =>
    `<div style="display:inline-block; vertical-align:${k > 1 ? 'top' : '-4px'}; width:${W}px; height:${H}px; font-size:0; line-height:0; border:1px solid rgba(26,26,26,0.25); overflow:hidden;${extra}">${inner}</div>`;
  const hStripes = (colors, hs) => colors.map((c, i) =>
    `<div style="width:${W}px; height:${hs[i] * k}px; font-size:0; line-height:0; background:${c};"></div>`).join('');
  const vStripes = (colors, ws) => colors.map((c, i) =>
    `<div style="display:inline-block; width:${ws[i] * k}px; height:${H}px; font-size:0; line-height:0; background:${c};"></div>`).join('');
  const flags = {
    // 五星红旗：大星居左，四颗小星呈纵向弧线环拱其右侧（0/6/6/0 缩进 = 真旗小星
    // 所在圆弧）。每颗小星独立成行且行高=字号、height 显式声明——Gmail 会重算行高，
    // 行高小于字号时字形被挤压裁切，曾导致小星丢失；此写法强制五颗齐全。
    China: box(
      `<div style="width:${W}px; height:${H}px; background:#DE2910; text-align:left; font-size:0; line-height:0;">`
      + `<div style="display:inline-block; vertical-align:top; width:${12 * k}px; text-align:center; padding-top:${2 * k}px; font-size:${12 * k}px; line-height:${13 * k}px; color:#FFDE00;">&#9733;</div>`
      + `<div style="display:inline-block; vertical-align:top; width:${16 * k}px; padding-top:${1 * k}px;">`
      + [0, 3, 3, 0].map((pad) =>
          `<div style="height:${4.5 * k}px; font-size:${4.5 * k}px; line-height:${4.5 * k}px; color:#FFDE00; padding-left:${pad * k}px; overflow:visible;">&#9733;</div>`
        ).join('')
      + `</div>`
      + `</div>`),
    India: box(hStripes(['#FF9933', '#ffffff', '#138808'], [7, 6, 7])),
    Mexico: box(vStripes(['#006847', '#ffffff', '#CE1126'], [10, 10, 10])),
    Philippines: box(
      `<div style="display:inline-block; width:${8 * k}px; height:${H}px; font-size:0; line-height:0; background:#ffffff;"></div>`
      + `<div style="display:inline-block; width:${W - 8 * k}px; height:${H}px; font-size:0; line-height:0; vertical-align:top;">`
      + `<div style="width:${W - 8 * k}px; height:${10 * k}px; font-size:0; line-height:0; background:#0038A8;"></div>`
      + `<div style="width:${W - 8 * k}px; height:${10 * k}px; font-size:0; line-height:0; background:#CE1126;"></div>`
      + `</div>`),
    // The site shows its blue globe for the ROW pool; a bordered blue disc is the
    // closest email-safe stand-in.
    Taiwan: `<div style="display:inline-block; vertical-align:${k > 1 ? 'top' : '-3px'}; width:${14 * k}px; height:${14 * k}px; font-size:0; line-height:0; background:#3b82f6; border:1px solid #1e40af; border-radius:50%;"></div>`,
  };
  const f = flags[country];
  return f ? `<!--[if !mso]><!-->${k > 1 ? '' : '&nbsp;'}${f}<!--<![endif]-->` : '';
};

// One composed figure, price-and-volume style: the cutoff-position step line on top
// (that line IS the cumulative story — each month's advance stacks into position), the
// per-month movement columns below, both over the SAME 12 columns and one month axis.
// They used to be two separate panels with different windows (24 vs 12 months), which
// hid the fact that they are two views of the same data. Email constraints as ever:
// tables + background colors only, the "line" is a row of joined column caps.
const renderBulletinFigure = (cutPoints, series, lang, chartCode = 'A') => {
  if (!Array.isArray(series) || series.length < 2) return '';

  const days = (s) => (typeof s.days === 'number' ? Math.round(s.days) : 0);
  const n = series.length;
  const total = series.reduce((sum, s) => sum + days(s), 0);
  const maxUp = Math.max(...series.map((s) => Math.max(days(s), 0)), 0);
  const maxDown = Math.max(...series.map((s) => Math.max(-days(s), 0)), 0);
  const hasNeg = maxDown > 0;

  const UP_PX = 60;
  // 12px headroom: value labels live INSIDE each bar's cell, stacked right on the
  // bar's own top — a separate label row parked every number at the same height,
  // which left short bars with digits floating in space.
  const LABEL_H = 12;
  const perDay = (UP_PX - LABEL_H) / Math.max(maxUp, maxDown, 1);
  const DOWN_PX = hasNeg ? Math.ceil(maxDown * perDay) + LABEL_H : 0;
  const TREND_PX = 40;
  const TREND_FILL_GREEN = '#dfeae3'; // light tint of CUMULATIVE_COLOR for the position layer

  const shortMonth = (m) => {
    const [y, mo] = m.split('-');
    return lang === 'en' ? `${mo}/${y.slice(2)}` : `${y.slice(2)}年${parseInt(mo, 10)}月`;
  };
  const labelStyle = "font-family:'Courier New',monospace; font-size:9px; color:#6b6a64; white-space:nowrap;";

  // ---- Position layer (the line): cutoffs aligned to the same months as the bars.
  // cutPoints may span a longer window; keep the entry per bar month plus the one
  // just before the window, for the 起 label.
  let trendRows = '';
  let trendCaption = '';
  const byMonth = new Map((Array.isArray(cutPoints) ? cutPoints : []).map((pt) => [pt.month, pt]));
  const aligned = series.map((sm) => byMonth.get(sm.month) || null);
  const usable = aligned.filter(Boolean);
  if (usable.length >= 2) {
    const toT = (pt) => Date.parse(`${pt.cutoff}T00:00:00Z`);
    const min = Math.min(...usable.map(toT));
    const max = Math.max(...usable.map(toT));
    const span = Math.max(max - min, 1);
    // In-cell labels riding the stairs: the cutoff reached on the window's biggest
    // jump, and the running total over the final step — anchored to the line itself
    // instead of floating in the header row.
    let jumpIdx = -1, jumpMax = 0;
    series.forEach((sm, i) => { if (days(sm) > jumpMax && aligned[i]) { jumpMax = days(sm); jumpIdx = i; } });
    const capLabel = (i) => {
      const bits = [];
      if (i === n - 1) bits.push(`<span style="color:${CUMULATIVE_COLOR}; font-weight:bold;">${total >= 0 ? '+' : '−'}${Math.abs(total)}</span>`);
      else if (i === jumpIdx && aligned[i]) bits.push(aligned[i].cutoff);
      return bits.length
        ? `<div style="font-family:'Courier New',monospace; font-size:7.5px; line-height:9px; color:#6b6a64; white-space:nowrap; text-align:${i === n - 1 ? 'right' : 'center'}; padding-bottom:1px;">${bits.join('')}</div>`
        : '';
    };
    const capRow = aligned.map((pt, i) => {
      if (!pt) return `<td valign="bottom" height="${TREND_PX}" style="padding:0; height:${TREND_PX}px;"></td>`;
      // 12px floor: the lowest cutoff is not "zero", it just started the window —
      // a 5px sliver glued to the divider read as a broken line floating in space.
      const h = 12 + Math.round(((toT(pt) - min) / span) * (TREND_PX - 16));
      return `<td valign="bottom" height="${TREND_PX}" style="padding:0; height:${TREND_PX}px;">${capLabel(i)}<div style="height:${h}px; font-size:0; background:${TREND_FILL_GREEN}; border-top:3px solid ${CUMULATIVE_COLOR};">&nbsp;</div></td>`;
    }).join('');
    const first = usable[0], last = usable[usable.length - 1];
    const endLabelRow = `
      <tr>
        <td colspan="${Math.ceil(n / 2)}" align="left" style="padding:0 0 3px; font-family:'Courier New',monospace; font-size:8px; color:#6b6a64; white-space:nowrap;">${lang === 'en' ? 'from' : '起'}&nbsp;${first.cutoff}</td>
        <td colspan="${Math.floor(n / 2)}" align="right" style="padding:0 0 3px; font-family:'Courier New',monospace; font-size:8px; color:#6b6a64; white-space:nowrap;">${lang === 'en' ? 'now' : '现'}&nbsp;${last.cutoff}</td>
      </tr>`;
    trendRows = `${endLabelRow}
      <tr>${capRow}</tr>
      <tr><td colspan="${n}" style="height:4px; font-size:0; line-height:0;">&nbsp;</td></tr>`;
    trendCaption = '';
  }

  // ---- Movement layer: each cell stacks [value label]+[bar], bottom-anchored, so
  // the number rides its own bar's top no matter how short the bar is.
  const upBarRow = series.map((sm) => {
    const d = days(sm);
    const inner = d > 0
      ? `<div align="center" style="height:${LABEL_H}px; line-height:${LABEL_H}px; text-align:center; ${labelStyle}">${d}</div>`
        + `<div style="height:${Math.max(Math.round(d * perDay), 2)}px; font-size:0; background:${ADVANCE_COLOR};">&nbsp;</div>`
      : d === 0
        ? `<div style="width:60%; margin:0 auto; height:2px; font-size:0; background:#c5c2b4;">&nbsp;</div>`
        : '';
    return `<td valign="bottom" height="${UP_PX}" style="padding:0 4px; height:${UP_PX}px;">${inner}</td>`;
  }).join('');

  const downBarRow = hasNeg
    ? series.map((sm) => {
        const d = days(sm);
        const inner = d < 0
          ? `<div style="height:${Math.max(Math.round(-d * perDay), 2)}px; font-size:0; background:${RETROGRESS_COLOR};">&nbsp;</div>`
            + `<div align="center" style="height:${LABEL_H}px; line-height:${LABEL_H}px; text-align:center; ${labelStyle}">−${Math.abs(d)}</div>`
          : '';
        return `<td valign="top" height="${DOWN_PX}" style="padding:0 4px; height:${DOWN_PX}px; border-top:1px solid #b8b6ac;">${inner}</td>`;
      }).join('')
    : '';

  const tickBorder = hasNeg ? '' : ' border-top:1px solid #b8b6ac;';
  const tickRow = series.map((sm, i) => {
    const show = i === 0 || i === n - 1;
    const align = i === 0 ? 'left' : 'right';
    return `<td align="${show ? align : 'center'}" style="padding:4px 1px 0;${tickBorder} font-family:'Courier New',monospace; font-size:9px; color:#8a8980; white-space:nowrap;">${show ? shortMonth(sm.month) : ''}</td>`;
  }).join('');

  // Streak bracket — the dominant run, drawn under exactly the months it covers.
  const runs = [];
  let runStart = 0;
  const kind = (d) => (d > 0 ? 'adv' : d < 0 ? 'ret' : 'zero');
  for (let i = 1; i <= n; i++) {
    if (i === n || kind(days(series[i])) !== kind(days(series[runStart]))) {
      runs.push({ kind: kind(days(series[runStart])), start: runStart, len: i - runStart });
      runStart = i;
    }
  }
  const best = (k) => runs.filter((r) => r.kind === k && r.len >= 3).sort((a, b) => b.len - a.len)[0] || null;
  const streak = best('zero') || best('ret') || best('adv');
  let streakRow = '';
  if (streak) {
    const text = streak.kind === 'zero'
      ? (lang === 'en' ? `flat ${streak.len} months straight` : `连续 ${streak.len} 个月没动`)
      : streak.kind === 'ret'
        ? (lang === 'en' ? `${streak.len} straight months of retrogression` : `连续 ${streak.len} 个月倒退`)
        : (lang === 'en' ? `${streak.len} straight months advancing` : `连续 ${streak.len} 个月前进`);
    const before = streak.start > 0 ? `<td colspan="${streak.start}">&nbsp;</td>` : '';
    const after = n - streak.start - streak.len > 0 ? `<td colspan="${n - streak.start - streak.len}">&nbsp;</td>` : '';
    streakRow = `
      <tr>
        ${before}
        <td colspan="${streak.len}" align="center" style="padding:3px 2px 0;"><div style="border-top:1px solid #c5c2b4; padding-top:2px; font-family:'Courier New',monospace; font-size:9px; color:#8a8980; white-space:nowrap;">${escapeHtml(text)}</div></td>
        ${after}
      </tr>`;
  }

  const legendKey = (swatch, text) =>
    `<span style="white-space:nowrap;">${swatch}<span style="font-size:10px; color:#6b6a64; vertical-align:middle;">&nbsp;${escapeHtml(text)}</span></span>`;
  // font-size:0 on the swatches: the &nbsp; inside otherwise inherits the body size
  // and inflates an 8px square into a tall bar (seen live in Gmail iOS).
  const sq = (color) => `<span style="display:inline-block; width:8px; height:8px; font-size:0; line-height:0; background:${color}; vertical-align:middle;">&nbsp;</span>`;
  const lineSw = `<span style="display:inline-block; width:12px; height:3px; font-size:0; line-height:0; background:${CUMULATIVE_COLOR}; vertical-align:middle;">&nbsp;</span>`;
  const legend = `
    <div style="margin-top:8px; line-height:1.8;">
      ${trendRows ? legendKey(lineSw, lang === 'en' ? 'Top · cutoff position (cumulative)' : '上 · 截止日位置（累计）') + '&nbsp;&nbsp;&nbsp;' : ''}
      ${legendKey(sq(ADVANCE_COLOR), lang === 'en' ? (trendRows ? 'Bottom · monthly advance' : 'Monthly advance') : (trendRows ? '下 · 单月前进' : '单月前进'))}&nbsp;&nbsp;&nbsp;
      ${hasNeg ? legendKey(sq(RETROGRESS_COLOR), lang === 'en' ? 'Retrogression' : '倒退') : ''}
    </div>`;

  const caption = trendRows ? '' : (lang === 'en'
    ? `Monthly movement, last ${n} months.`
    : `近 ${n} 个月逐月变化。`);

  return `
    <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:10px;">${lang === 'en' ? `Bulletin chart · Chart ${chartCode}` : `排期图表 · 表 ${chartCode}`}<span style="letter-spacing:0.02em; text-transform:none; color:#8a8980;">${lang === 'en' ? (chartCode === 'B' ? ' — filing milestone' : ' — approval milestone') : (chartCode === 'B' ? ' · 递件口径' : ' · 获批口径')}</span></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">${trendRows}
      <tr>${upBarRow}</tr>
      ${hasNeg ? `<tr>${downBarRow}</tr>` : ''}
      <tr>${tickRow}</tr>${streakRow}
    </table>
    ${caption ? `<div style="font-size:11px; line-height:1.6; color:#8a8980; margin-top:8px;">${escapeHtml(caption)}</div>` : ''}${legend}`;
};

// App.jsx reads the case off the query string (c/ct/pd/in/ps) and — importantly —
// treats a URL case as "already onboarded", so this link lands the subscriber on their
// own numbers instead of the first-run category picker.
const buildCaseUrl = (siteUrl, userCase) => {
  const base = String(siteUrl || '').replace(/\/+$/, '');
  if (!userCase?.category || !userCase?.country || !userCase?.priorityDate) return base;
  const p = new URLSearchParams();
  p.set('c', userCase.category);
  p.set('ct', userCase.country);
  p.set('pd', userCase.priorityDate);
  if (userCase.inUS === false) p.set('in', '0');
  if (userCase.petitionerStatus) p.set('ps', userCase.petitionerStatus);
  return `${base}/?${p.toString()}`;
};

export const renderMonthlyUpdateEmail = ({ email, userCase, update, uscisChart, notices, noticeI18n, bulletinMonthLabel, language, siteUrl, unsubscribeUrl }) => {
  const lang = language === 'en' ? 'en' : 'zh';
  const caseUrl = buildCaseUrl(siteUrl, userCase);

  const category = formatCategory(userCase?.category);
  const country = formatCountry(userCase?.country);
  const priorityDate = escapeHtml(userCase?.priorityDate) || '—';

  const fa = update.finalAction;
  const fil = update.filing;
  const isNowCurrent = fa.status?.status === 'current' || fa.status?.status === 'eligible' || fa.status?.status === 'overdue';

  // Headline split into pre/accent/post so the HTML version can color just the verdict
  // phrase ("advanced 243 days") while subject and plain-text reuse the same words.
  const GOOD_COLOR = '#0e6b3e';
  const hp = isNowCurrent
    ? (lang === 'en'
        ? { pre: 'Your priority date ', accent: 'is current', post: '', color: GOOD_COLOR }
        : { pre: '你的优先日', accent: '已经排到了', post: '', color: GOOD_COLOR })
    : fa.movement.type === 'advanced'
      ? (lang === 'en'
          ? { pre: 'Your category ', accent: `advanced ${fa.movement.days} days`, post: ' this month', color: ADVANCE_COLOR }
          : { pre: '本月你的类别', accent: `前进了 ${fa.movement.days} 天`, post: '', color: ADVANCE_COLOR })
      : fa.movement.type === 'retrogressed'
        ? (lang === 'en'
            ? { pre: 'Your category ', accent: 'retrogressed', post: ' this month', color: RETROGRESS_COLOR }
            : { pre: '本月你的类别', accent: '出现倒退', post: '', color: RETROGRESS_COLOR })
        : fa.movement.type === 'unavailable'
          ? (fa.movement.still
              ? (lang === 'en'
                  ? { pre: 'Your category ', accent: 'is still unavailable (U)', post: '', color: RETROGRESS_COLOR }
                  : { pre: '本月你的类别', accent: '持续无名额（U）', post: '', color: RETROGRESS_COLOR })
              : (lang === 'en'
                  ? { pre: 'Your category ', accent: 'went unavailable (U)', post: '', color: RETROGRESS_COLOR }
                  : { pre: '本月你的类别', accent: '转为无名额（U）', post: '', color: RETROGRESS_COLOR }))
          : fa.movement.type === 'resumed'
            ? (lang === 'en'
                ? { pre: 'Your category ', accent: 'resumed', post: ' — numbers are back', color: GOOD_COLOR }
                : { pre: '你的类别', accent: '恢复名额了', post: '', color: GOOD_COLOR })
            : (lang === 'en'
                ? { pre: 'No movement in your category this month', accent: '', post: '', color: '#6b6a64' }
                : { pre: '本月你的类别没有变化', accent: '', post: '', color: '#6b6a64' });
  const headline = hp.pre + hp.accent + hp.post;
  const headlineHtml = `${escapeHtml(hp.pre)}<span style="color:${hp.color}; font-weight:600;">${escapeHtml(hp.accent)}</span>${escapeHtml(hp.post)}`;
  const eyebrowColor = hp.accent ? hp.color : '#8b3a3a';

  const subject = lang === 'en'
    ? `Visa Bulletin ${bulletinMonthLabel}: ${headline}`
    : `Visa Bulletin ${bulletinMonthLabel} 更新：${headline}`;

  // A range, not a point estimate. The two ends are both computed straight from real
  // movement — "this month's pace" and "the trailing 12-month average pace" — because
  // for slow categories a single fast month makes a point estimate wildly optimistic.
  const fc = !isNowCurrent && update.forecast ? update.forecast : null;
  const hasRange = fc && fc.windowMean !== null && Math.round(fc.fastRate) !== Math.round(fc.slowRate);

  const rangeHeadline = fc
    ? (hasRange
        ? `${formatMonthsCompact(fc.fastMonths, lang)} – ${formatMonthsCompact(fc.slowMonths, lang)}`
        : formatMonthsCompact(fc.fastMonths, lang))
    : '';

  // "乐观端 / 保守端" matches the pace-basis vocabulary the site's summary card and
  // Forecast tab now use, so email and app describe the same range in the same words.
  const rangeDetail = !fc ? '' : hasRange
    ? (lang === 'en'
        ? `The optimistic end assumes this month's pace holds (${Math.round(fc.fastRate)} days/month). The conservative end uses the average pace actually delivered over the last ${fc.windowSize} months (${Math.round(fc.slowRate)} days/month).`
        : `乐观端假设本月这个速度能保持（${Math.round(fc.fastRate)} 天/月），保守端用的是过去 ${fc.windowSize} 个月实际平均速度（${Math.round(fc.slowRate)} 天/月）。`)
    : (lang === 'en'
        ? `Based on a pace of ${Math.round(fc.fastRate)} days/month.`
        : `按每月推进 ${Math.round(fc.fastRate)} 天估算。`);

  const etaLine = rangeDetail;

  // The months-range translated onto the calendar — "6.9 years" forces the reader to
  // do arithmetic; "around 2033年5月" doesn't.
  const monthToCal = (months) => {
    if (!isFinite(months) || months === null) return null;
    const d = new Date();
    d.setDate(d.getDate() + Math.round(months * 30.44));
    return lang === 'en'
      ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      : `${d.getFullYear()}年${d.getMonth() + 1}月`;
  };
  const calFast = fc ? monthToCal(fc.fastMonths) : null;
  const calSlow = fc && hasRange ? monthToCal(fc.slowMonths) : null;
  // Calendar-first: "2027年10月 – 2033年6月" answers the reader's actual question;
  // the duration form ("14 个月 – 6.9 年") demotes to a secondary line.
  const rangeHeadlineCal = calFast
    ? (calSlow ? `${calFast} – ${calSlow}` : (lang === 'en' ? `~${calFast}` : `约 ${calFast}`))
    : '';
  const durLine = rangeHeadline && rangeHeadlineCal
    ? (lang === 'en' ? `That is ${rangeHeadline} from now.` : `即距今约 ${rangeHeadline}。`)
    : '';

  // Inbox preview line. The subject already carries the headline, so the preheader
  // adds the NEXT facts a subscriber wants — repeating the headline wastes the slot.
  const preheaderGap = !isNowCurrent && fa.status?.days ? fa.status.days : null;
  const preheader = [
    `${lang === 'en' ? 'Chart A' : '表A'} ${formatDateForLang(fa.current, lang)}`,
    preheaderGap ? (lang === 'en' ? `${preheaderGap.toLocaleString('en-US')} days to your PD` : `距优先日 ${preheaderGap.toLocaleString('en-US')} 天`) : '',
    calFast && calSlow
      ? (lang === 'en' ? `optimistic ~${calFast} · conservative ~${calSlow}` : `乐观约 ${calFast} · 保守约 ${calSlow}`)
      : calFast ? (lang === 'en' ? `optimistic ~${calFast}` : `乐观约 ${calFast}`) : '',
  ].filter(Boolean).join(' · ') || headline;
  // 12-month series on purpose: twelve ~34px columns carry one aligned row of value
  // labels; the 24-month rhythm lives in the cutoff trend chart above.
  const ad = update.adopted || null;
  const figureHtml = renderBulletinFigure(
    ad?.cutoffHistory || update.cutoffHistory,
    ad?.series || fc?.series,
    lang,
    ad?.chart || 'A'
  );

  // How far the cutoff still has to travel to reach this subscriber's priority date.
  const gapDays = !isNowCurrent && fa.status?.days ? fa.status.days : null;
  const gapLine = gapDays
    ? (lang === 'en'
        ? `The current cutoff is ${gapDays.toLocaleString('en-US')} days short of your priority date.`
        : `当前截止日距你的优先日还差 ${gapDays.toLocaleString('en-US')} 天。`)
    : '';

  // Bulletin notices that mention this subscriber's exact category token (e.g. "EB-2",
  // "F4"). The State Department's own retrogression warnings live here; only the ones
  // aimed at this category are shown, so most months this block simply doesn't render.
  const catToken = userCase?.category || '';
  const catRe = catToken.startsWith('EB')
    ? new RegExp(`EB-?${catToken.slice(2)}\\b`, 'i')
    : new RegExp(`\\b${catToken}\\b`, 'i');
  let relevantNotices = (Array.isArray(notices) ? notices : [])
    .filter((n) => n && (catRe.test(n.title || '') || catRe.test(n.text || '')))
    .slice(0, 2);
  // No category-specific notice → fall back to section D (the general availability
  // note), so every email carries the State Department's own framing of the month.
  if (relevantNotices.length === 0 && Array.isArray(notices)) {
    const d = notices.find((n) => n && n.letter === 'D');
    if (d) relevantNotices = [d];
  }
  const noticesHtml = relevantNotices.map((n) => {
    // Chinese-language subscribers get the AI translation (marked as such, original
    // authoritative); English subscribers get the original verbatim.
    const tr = lang === 'zh' ? noticeI18n?.[n.letter]?.[language === 'tw' ? 'tw' : 'zh'] : null;
    const title = tr?.title || n.title || '';
    const body = tr ? (tr.text || '') : (n.text || '').slice(0, 320) + ((n.text || '').length > 320 ? '…' : '');
    return `
    <div style="border-left:2px solid ${RETROGRESS_COLOR}; padding:10px 14px; background:#f9f1ec; margin-top:10px;">
      <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.12em; color:${RETROGRESS_COLOR}; text-transform:uppercase; margin-bottom:6px;">${lang === 'en' ? 'From the bulletin' : '公告原文提醒'} · ${escapeHtml(n.letter || '')}</div>
      <div style="font-size:12px; font-weight:600; color:#1a1a1a; margin-bottom:4px;">${escapeHtml(title)}</div>
      <div style="font-size:12px; line-height:1.65; color:#4a4a45;">${escapeHtml(body)}</div>
      ${tr ? `<div style="font-size:9px; color:#8a8980; margin-top:5px;">AI 译文，以英文原文为准 · 原题：${escapeHtml((n.title || '').slice(0, 80))}</div>` : ''}
    </div>`;
  }).join('');

  // "表 A / 表 B" mirrors the bulletin's own section lettering (A. FINAL ACTION DATES,
  // B. DATES FOR FILING) and is what Chinese-language immigration discussion uses.
  // The English chart names stay in place per the repo convention of keeping domain
  // terms in the original.
  // Movement text carries the same advance/retrogress colors as the charts, so the
  // whole email speaks one color language (blue = forward, rust = backward).
  const moveColor = (movement) => (movement.type === 'retrogressed' || movement.type === 'unavailable') ? RETROGRESS_COLOR
    : movement.type === 'none' ? '#8a8980' : ADVANCE_COLOR;

  // ---- Adopted-chart wait math (mirrors the homepage hero card) ----
  // `ad` is the chart this subscriber actually lives by: B (filing) for family
  // categories, A (approval) for employment. All hero numbers derive from it so the
  // email never mixes chart-A pace into a chart-B gap.
  const adGap = ad && typeof ad.gapDays === 'number' && ad.gapDays > 0 ? ad.gapDays : null;
  const adPace = ad && typeof ad.paceMo === 'number' && ad.paceMo > 0 ? ad.paceMo : null;
  const adEtaMo = ad && typeof ad.etaMonths === 'number' && isFinite(ad.etaMonths) && ad.etaMonths > 0 ? ad.etaMonths : null;
  const adChartName = ad ? (lang === 'en' ? `Chart ${ad.chart}` : `表${ad.chart}`) : '';
  const adMilestone = ad?.chart === 'B'
    ? (lang === 'en' ? 'until you can file' : '距离可以递件，还需要')
    : (lang === 'en' ? 'until final approval' : '距离可以获批，还需要');
  const adHero = adEtaMo === null ? ''
    : adEtaMo < 12
      ? (lang === 'en' ? `~${Math.round(adEtaMo)} months` : `约 ${Math.round(adEtaMo)} 个月`)
      : (lang === 'en' ? `~${(adEtaMo / 12).toFixed(1)} years` : `约 ${(adEtaMo / 12).toFixed(1)} 年`);
  const adCal = adEtaMo !== null ? monthToCal(adEtaMo) : null;
  // Optimistic end = this month's actual pace on the adopted chart; conservative end
  // = the trailing 12-month average. Same range logic the site's summary card uses.
  let adCalFast = null, adCalSlow = null;
  if (adEtaMo !== null && adGap && ad?.movement?.type === 'advanced' && ad.movement.days > 0) {
    const mFast = adGap / ad.movement.days;
    if (Math.round(mFast) !== Math.round(adEtaMo)) {
      adCalFast = monthToCal(Math.min(mFast, adEtaMo));
      adCalSlow = monthToCal(Math.max(mFast, adEtaMo));
    }
  }
  const adMoveTxt = ad?.movement ? movementCopy(ad.movement, lang) : '';
  const adDeltaGood = ad?.movement?.type === 'advanced' || ad?.movement?.type === 'resumed';
  const adDeltaLine = !adMoveTxt || !ad ? '' : (lang === 'en'
    ? `${adDeltaGood ? 'Good news: ' : ad.movement.type === 'none' ? '' : 'Heads up: '}${adChartName} ${adMoveTxt} this month`
    : `${adDeltaGood ? '好消息：' : ad.movement.type === 'none' ? '' : '注意：'}本月${adChartName}${adMoveTxt}`);
  const adDeltaColor = ad?.movement ? moveColor(ad.movement) : '#8a8980';
  // Reasoning chain — the same arithmetic the site's 怎么算的 expander shows. Line 3
  // keeps the RAW quotient so the division always checks out; when the approval ETA
  // was floored to the filing ETA (A can't land before B), a fourth line says so.
  const adPaceTxt = adPace !== null ? String(Math.round(adPace * 10) / 10) : '';
  const adRawMo = (adGap && adPace) ? Math.round(adGap / adPace) : null;
  const adChain = (adGap && adPace && adEtaMo !== null) ? (lang === 'en' ? [
    `Your priority date is ${adGap.toLocaleString('en-US')} days behind the current ${adChartName} cutoff`,
    `${adChartName} has averaged ${adPaceTxt} days of advance per month over the last 12 months`,
    `${adGap.toLocaleString('en-US')} ÷ ${adPaceTxt} ≈ ${adRawMo} months`,
    ...(ad.clampedToB ? ['Approval (Chart A) can\'t come before filing (Chart B), so the estimate is floored to Chart B\'s date'] : []),
  ] : [
    `你的优先日距${adChartName}当前截止日还差 ${adGap.toLocaleString('en-US')} 天`,
    `${adChartName}近 12 个月平均每月前进 ${adPaceTxt} 天`,
    `${adGap.toLocaleString('en-US')} ÷ ${adPaceTxt} ≈ ${adRawMo} 个月${ad.clampedToB ? '' : `，即${adHero}`}`,
    ...(ad.clampedToB ? ['获批（表A）不会早于递件（表B），故预计以表B的日期为下限'] : []),
  ]) : null;
  // How far along the whole journey is: time since PD over (time since PD + remaining).
  let adPct = null;
  if (adEtaMo !== null && userCase?.priorityDate) {
    const pdMs = Date.parse(userCase.priorityDate);
    if (isFinite(pdMs)) {
      const elapsed = Date.now() - pdMs;
      if (elapsed > 0) {
        adPct = Math.min(99, Math.max(1, Math.round(100 * elapsed / (elapsed + adEtaMo * 30.44 * 86400000))));
      }
    }
  }

  // Per-chart station lines (距X天 · 预计X) from the per-chart pace pipeline, so the
  // B row is paced by B history and the A row by A history.
  const st = update.stations || null;
  const stationSub = (stn) => {
    if (!stn || typeof stn.gapDays !== 'number' || stn.gapDays <= 0) return '';
    const gapTxt = stn.gapDays.toLocaleString('en-US');
    const cal = (typeof stn.etaMonths === 'number' && isFinite(stn.etaMonths) && stn.etaMonths > 0) ? monthToCal(stn.etaMonths) : null;
    const flooredNote = stn.clampedToB ? (lang === 'en' ? ' (not before Chart B)' : '（不早于表B）') : '';
    return lang === 'en'
      ? `${gapTxt} days to your PD${cal ? ` · est. ${cal}${flooredNote}` : ''}`
      : `距你的优先日 ${gapTxt} 天${cal ? ` · 预计 ${cal}${flooredNote}` : ''}`;
  };
  const rows = [
    {
      label: lang === 'en' ? 'Chart A · Final Action (approval)' : '表 A · 能否获批（Final Action）',
      prev: formatDateForLang(fa.previous, lang),
      cur: formatDateForLang(fa.current, lang),
      move: movementCopy(fa.movement, lang),
      moveColor: moveColor(fa.movement),
      sub: stationSub(st?.A),
      adopted: ad?.chart === 'A',
    },
    {
      label: lang === 'en' ? 'Chart B · Dates for Filing (filing)' : '表 B · 能否递件（Dates for Filing）',
      prev: formatDateForLang(fil.previous, lang),
      cur: formatDateForLang(fil.current, lang),
      move: movementCopy(fil.movement, lang),
      moveColor: moveColor(fil.movement),
      sub: stationSub(st?.B),
      adopted: ad?.chart === 'B',
    },
  ];

  // Deliberately one short line: the chart names already appear in the row labels
  // directly above, so repeating them here only pushed the note into a wrapped block.
  // When the scraped USCIS designation covers this bulletin month, the note upgrades
  // from the generic explainer to the definitive answer for this subscriber's category.
  let chartNote = lang === 'en'
    ? 'Chart A decides approval · Chart B decides filing'
    : '表 A 决定能否获批，表 B 决定能否递件';
  const chartKindForCase = userCase?.category?.startsWith('EB') ? uscisChart?.employment : uscisChart?.family;
  if (chartKindForCase === 'filing' || chartKindForCase === 'finalAction') {
    const chartName = chartKindForCase === 'filing' ? (lang === 'en' ? 'Chart B' : '表 B') : (lang === 'en' ? 'Chart A' : '表 A');
    chartNote = lang === 'en'
      ? `USCIS: file I-485 this month using ${chartName}`
      : `本月递交 I-485 用${chartName}（USCIS 判定）`;
  }

  const text = [
    headline,
    '',
    lang === 'en' ? 'YOUR CASE' : '你的案子',
    `${lang === 'en' ? 'Category' : '类别'}: ${category}`,
    `${lang === 'en' ? 'Country' : '出生国'}: ${country}`,
    `${lang === 'en' ? 'Priority Date' : '优先日'}: ${priorityDate}`,
    '',
    lang === 'en' ? 'THIS MONTH' : '本月变化',
    ...rows.map((r) => `${r.label}${r.adopted ? (lang === 'en' ? ' [YOUR CHART]' : '【你看这张】') : ''}: ${r.prev} -> ${r.cur} (${r.move})${r.sub ? `\n  ${r.sub}` : ''}`),
    '',
    chartNote,
    '',
    adHero
      ? `${adMilestone}: ${adHero}${adCal ? ` (${adCal})` : ''}`
      : rangeHeadline ? `${lang === 'en' ? 'ESTIMATED WAIT' : '预计还要等'}: ${rangeHeadlineCal || rangeHeadline}` : '',
    ...(adChain ? adChain.map((l, i) => `${i + 1}. ${l}`) : []),
    durLine,
    etaLine,
    gapLine,
    (() => {
      // Same 12-month net the chart's cumulative column shows, for text-only clients.
      const s = Array.isArray(fc?.series) ? fc.series : null;
      if (!s) return '';
      const t12 = s.reduce((sum, p) => sum + (typeof p.days === 'number' ? Math.round(p.days) : 0), 0);
      return lang === 'en'
        ? `Chart A moved ${t12 >= 0 ? '+' : '−'}${Math.abs(t12)} days net over the last ${s.length} months.`
        : `近 ${s.length} 个月表A累计${t12 >= 0 ? '前进' : '倒退'} ${Math.abs(t12)} 天。`;
    })(),
    '',
    `${lang === 'en' ? 'Open the app' : '打开应用'}: ${siteUrl}`,
    `${lang === 'en' ? 'Unsubscribe' : '取消订阅'}: ${unsubscribeUrl}`,
  ].filter((l) => l !== '' || true).join('\n');

  // Each table gets a stacked two-line block instead of four squeezed columns:
  // line 1 = table name (left) + movement (right), line 2 = old → new in monospace.
  // Dates never wrap this way, regardless of client width.
  const rowsHtml = rows.map((r) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e4e1d6;">
      <tr>
        <td colspan="2" style="padding:10px 0 2px; font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.1em; color:#6b6a64; text-transform:uppercase;">${escapeHtml(r.label)}${r.adopted ? `&nbsp;&nbsp;<span style="display:inline-block; background:#1a1a1a; color:#fdfcf8; font-size:8px; letter-spacing:0.08em; padding:1px 5px 2px; vertical-align:1px;">${lang === 'en' ? 'YOUR CHART' : '你看这张'}</span>` : ''}</td>
      </tr>
      <tr>
        <td style="padding:0 0 ${r.sub ? '2px' : '10px'}; font-family:'Courier New',monospace; font-size:13px; color:#1a1a1a; white-space:nowrap;">${
          r.prev === r.cur
            ? `<b>${r.cur}</b>`
            : `<span style="color:#8a8980; text-decoration:line-through;">${r.prev}</span><span style="color:#8a8980;">&nbsp;→&nbsp;</span><b>${r.cur}</b>`
        }</td>
        <td align="right" style="padding:0 0 ${r.sub ? '2px' : '10px'} 16px; font-size:12px; color:${r.moveColor}; white-space:nowrap;">${escapeHtml(r.move)}</td>
      </tr>
      ${r.sub ? `<tr>
        <td colspan="2" style="padding:0 0 10px; font-size:11px; color:#8a8980; white-space:nowrap;">${escapeHtml(r.sub)}</td>
      </tr>` : ''}
    </table>`).join('');

  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead(subject)}
<body style="margin:0; padding:0; background:#f4f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a;">

<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ee;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background:#fdfcf8; border:1px solid #d4d2c8;">

        <tr>
          <td class="px" style="padding:32px 40px 20px; border-bottom:1px solid #1a1a1a;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Georgia,serif; font-size:22px; font-weight:500; letter-spacing:-0.01em; color:#1a1a1a;">${lang === 'en' ? 'Green Card Tracker' : '绿卡晴雨表'}</td>
                <td align="right" style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.1em; color:#6b6a64; text-transform:uppercase;">${escapeHtml(bulletinMonthLabel)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px" style="padding:28px 40px 8px;">
            <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:${eyebrowColor}; text-transform:uppercase; margin-bottom:8px;">${lang === 'en' ? '— Bulletin Update —' : '— 排期更新 —'}</div>
            <div class="headline" style="font-family:Georgia,serif; font-size:26px; line-height:1.3; font-weight:400; letter-spacing:-0.01em; margin-bottom:6px; color:#1a1a1a;">${headlineHtml}</div>
          </td>
        </tr>

        <tr>
          <td class="px" style="padding:12px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL_BG}; border:1px solid ${PANEL_BORDER}; border-left:2px solid #1a1a1a;">
              <tr>
                <td style="padding:16px 18px;">
                  <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:10px;">${lang === 'en' ? 'Your Case' : '你的案子'}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td>
                        <div style="font-family:'Courier New',monospace; font-size:16px; font-weight:700; color:#1a1a1a; letter-spacing:0.02em;">${escapeHtml(category)} · ${escapeHtml(country)}</div>
                        <div style="font-size:12px; color:#6b6a64; margin:3px 0 14px;">${lang === 'en' ? 'Priority Date' : '优先日'}&nbsp;&nbsp;<span style="font-family:'Courier New',monospace; font-size:13px; color:#1a1a1a;">${priorityDate}</span></div>
                      </td>
                      <td align="right" valign="top" style="padding-left:12px;">${countryFlagHtml(userCase?.country, 2)}</td>
                    </tr>
                  </table>
                  ${rowsHtml}
                  <div style="border-top:1px solid #e4e1d6; padding-top:9px; font-size:11px; line-height:1.5; color:#8a8980;">${escapeHtml(chartNote)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>


        ${(!isNowCurrent && adHero) ? `
        <tr>
          <td class="px" style="padding:16px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e9efe6; border-left:2px solid ${CUMULATIVE_COLOR};">
              <tr>
                <td style="padding:16px 18px;">
                  <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#4e6b58; text-transform:uppercase; margin-bottom:6px;">${escapeHtml(adMilestone)}</div>
                  <div style="font-family:Georgia,serif; font-size:32px; line-height:1.15; color:#1a1a1a; margin-bottom:6px;">${escapeHtml(adHero)}</div>
                  ${adCal ? `<div style="font-size:12px; line-height:1.6; color:#2a2a2a; white-space:nowrap;">${lang === 'en' ? `At ${escapeHtml(adChartName)}'s real 12-month pace · est. ${escapeHtml(adCal)}` : `按${escapeHtml(adChartName)}近 12 个月实际速度推算 · 预计 ${escapeHtml(adCal)}`}</div>` : ''}
                  ${(adCalFast && adCalSlow) ? `<div style="font-size:12px; line-height:1.6; color:#2a2a2a; white-space:nowrap;">${lang === 'en' ? `Optimistic ~${escapeHtml(adCalFast)} · conservative ~${escapeHtml(adCalSlow)}` : `乐观约 ${escapeHtml(adCalFast)} · 保守约 ${escapeHtml(adCalSlow)}`}</div>` : ''}
                  ${adDeltaLine ? `<div style="font-size:12px; line-height:1.6; color:${adDeltaColor}; font-weight:600; margin-top:8px;">${escapeHtml(adDeltaLine)}</div>` : ''}
                  ${adChain ? `
                  <div style="border-top:1px solid #d3ddd0; margin-top:10px; padding-top:9px;">
                    <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.12em; color:#4e6b58; text-transform:uppercase; margin-bottom:5px;">${lang === 'en' ? 'How this is computed' : '怎么算的'}</div>
                    ${adChain.map((line, i) => `<div style="font-size:11px; line-height:1.7; color:#4a4a45;"><span style="font-family:'Courier New',monospace; color:#8a8980;">${i + 1}.</span> ${escapeHtml(line)}</div>`).join('')}
                  </div>` : ''}
                  ${adPct !== null ? `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                    <tr>
                      <td style="font-size:9px; font-family:'Courier New',monospace; color:#8a8980; padding-bottom:4px;">${lang === 'en' ? 'PD' : '优先日'} ${priorityDate}</td>
                      <td align="right" style="font-size:9px; font-family:'Courier New',monospace; color:#8a8980; padding-bottom:4px;">${adCal ? `${lang === 'en' ? 'est.' : '预计'} ${escapeHtml(adCal)}` : ''}</td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="${adPct}%" height="8" style="background:${CUMULATIVE_COLOR}; font-size:0; line-height:0;">&nbsp;</td>
                      <td height="8" style="background:#d3ddd0; font-size:0; line-height:0;">&nbsp;</td>
                    </tr>
                  </table>
                  <div style="font-size:10px; color:#4e6b58; margin-top:4px;">${lang === 'en' ? `~${adPct}% of the estimated journey behind you` : `按这个预计，你已走完约 ${adPct}%`}</div>` : ''}
                  <div style="font-size:11px; line-height:1.6; color:#8a8980; margin-top:10px;">${lang === 'en'
                    ? 'A model estimate from historical pace, not a guarantee — the bulletin can speed up, slow down, or retrogress.'
                    : '基于历史速度的模型估算，不是承诺——排期可能加速、放缓，也可能倒退。'}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : etaLine ? `
        <tr>
          <td class="px" style="padding:16px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e9efe6; border-left:2px solid ${CUMULATIVE_COLOR};">
              <tr>
                <td style="padding:16px 18px;">
                  <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#4e6b58; text-transform:uppercase; margin-bottom:8px;">${lang === 'en' ? 'Estimated Wait' : '预计还要等'}</div>
                  <div style="font-family:Georgia,serif; font-size:24px; line-height:1.2; color:#1a1a1a; margin-bottom:8px;">${escapeHtml(rangeHeadlineCal || rangeHeadline)}</div>
                  ${durLine ? `<div style="font-size:12px; line-height:1.7; color:#2a2a2a; margin-bottom:4px;">${escapeHtml(durLine)}</div>` : ''}
                  <div style="font-size:12px; line-height:1.7; color:#2a2a2a;">${escapeHtml(etaLine)}</div>
                  ${gapLine ? `<div style="font-size:12px; line-height:1.7; color:#2a2a2a; margin-top:4px;">${escapeHtml(gapLine)}</div>` : ''}
                  <div style="font-size:11px; line-height:1.6; color:#8a8980; margin-top:8px;">${lang === 'en'
                    ? 'A model estimate from historical pace, not a guarantee — the bulletin can speed up, slow down, or retrogress.'
                    : '基于历史速度的模型估算，不是承诺——排期可能加速、放缓，也可能倒退。'}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ''}

        ${figureHtml ? `
        <tr>
          <td class="px" style="padding:16px 40px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL_BG}; border:1px solid ${PANEL_BORDER};">
              <tr><td style="padding:14px 14px 12px;">${figureHtml}</td></tr>
            </table>
          </td>
        </tr>` : ''}

        ${noticesHtml ? `
        <tr>
          <td class="px" style="padding:14px 40px 0;">${noticesHtml}</td>
        </tr>` : ''}

        <tr>
          <td align="center" class="px" style="padding:24px 40px;">
            <a href="${escapeHtml(caseUrl)}" style="display:inline-block; background:#1a1a1a; color:#fdfcf8; padding:11px 28px; text-decoration:none; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${lang === 'en' ? 'Open Green Card Tracker →' : '打开绿卡晴雨表 →'}</a>
          </td>
        </tr>

        <tr>
          <td align="center" class="px" style="padding:16px 40px 24px; border-top:1px solid #d4d2c8;">
            <div style="font-size:10px; color:#8a8980; line-height:1.7;">
              <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b6a64;">${lang === 'en' ? 'Unsubscribe' : '取消订阅'}</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(caseUrl)}" style="color:#6b6a64;">${lang === 'en' ? 'Edit case / preferences' : '修改优先日或设置'}</a>
              &nbsp;·&nbsp;
              ${lang === 'en' ? 'Data: travel.state.gov' : '数据来源：travel.state.gov'}
            </div>
            <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#b0afa6; text-transform:uppercase; margin-top:14px;">Green Card Tracker · JMJ · 2026</div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

  if (language === 'tw') {
    return { subject: toTraditional(subject), html: toTraditional(html), text: toTraditional(text) };
  }
  return { subject, html, text };
};

// ---- Confirmation Email (double opt-in) ----
// Sent on the FIRST subscribe request. Nothing is treated as an active subscription
// until the recipient clicks through, so a third party cannot sign someone else up
// and cannot make this domain send unsolicited mail on their behalf.
// Deliberately self-contained: it must render even if getCopy() changes shape.

export const renderConfirmEmail = ({ email, language, siteUrl, confirmUrl }) => {
  const lang = language === 'en' ? 'en' : language === 'tw' ? 'tw' : 'zh';

  const c = {
    en: {
      subject: 'Confirm your Green Card Tracker subscription',
      preheader: 'One click and you are set — we will watch the bulletin for you.',
      eyebrow: '— Confirm Subscription —',
      title: 'Almost there',
      body: 'Someone (hopefully you) asked to receive visa bulletin updates at this address. Click below to confirm and start receiving them.',
      cta: 'Confirm subscription',
      ignore: 'If this was not you, simply ignore this email. Nothing was subscribed and you will not hear from us again.',
      fallback: 'Button not working? Paste this link into your browser:',
      brand: 'Green Card Tracker',
    },
    zh: {
      subject: '确认订阅绿卡排期追踪',
      preheader: '点一下就好——之后排期更新我们替你盯着。',
      eyebrow: '— 确认订阅 —',
      title: '还差一步',
      body: '有人（希望是你本人）用这个邮箱申请订阅签证公告排期更新。点击下面的按钮确认，之后就会开始收到更新。',
      cta: '确认订阅',
      ignore: '如果这不是你本人操作，直接忽略这封邮件即可。订阅不会生效，我们也不会再打扰你。',
      fallback: '按钮点不动？把这个链接粘到浏览器里：',
      brand: '绿卡晴雨表',
    },
    tw: {
      subject: '確認訂閱綠卡排期追蹤',
      preheader: '點一下就好——之後排期更新我們替你盯著。',
      eyebrow: '— 確認訂閱 —',
      title: '還差一步',
      body: '有人（希望是你本人）用這個信箱申請訂閱簽證公告排期更新。點擊下面的按鈕確認，之後就會開始收到更新。',
      cta: '確認訂閱',
      ignore: '如果這不是你本人操作，直接忽略這封郵件即可。訂閱不會生效，我們也不會再打擾你。',
      fallback: '按鈕點不動？把這個連結貼到瀏覽器裡：',
      brand: '綠卡晴雨表',
    },
  }[lang];

  const safeUrl = escapeHtml(confirmUrl);

  const html = `<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : 'zh'}">
${emailHead(c.subject)}
<body style="margin:0; padding:0; background:#f4f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(c.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ee;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background:#fdfcf8; border:1px solid #d4d2c8;">

          <tr>
            <td class="px" style="padding:32px 40px 20px; border-bottom:1px solid #1a1a1a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Georgia,serif; font-size:22px; font-weight:500; letter-spacing:-0.01em; color:#1a1a1a;">${escapeHtml(c.brand)}</td>
                  <td align="right" style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.1em; color:#6b6a64; text-transform:uppercase;">${lang === 'en' ? 'Double opt-in' : '双重确认'}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:28px 40px 8px;">
              <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#8b3a3a; text-transform:uppercase; margin-bottom:8px;">${escapeHtml(c.eyebrow)}</div>
              <div class="headline" style="font-family:Georgia,serif; font-size:26px; line-height:1.25; font-weight:400; letter-spacing:-0.01em; margin-bottom:16px; color:#1a1a1a;">${escapeHtml(c.title)}</div>
              <div style="font-size:14px; line-height:1.7; color:#2a2a2a;">${escapeHtml(c.body)}</div>
            </td>
          </tr>

          <tr>
            <td align="center" class="px" style="padding:26px 40px 8px;">
              <a href="${safeUrl}" style="display:inline-block; background:#1a1a1a; color:#fdfcf8; padding:11px 28px; text-decoration:none; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(c.cta)}</a>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:14px 40px 20px;">
              <div style="font-size:11px; line-height:1.7; color:#8a8980;">
                ${escapeHtml(c.fallback)}<br>
                <span style="font-family:'Courier New',monospace; font-size:10px; word-break:break-all; color:#6b6a64;">${safeUrl}</span>
              </div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:16px 40px 24px; border-top:1px solid #d4d2c8;">
              <div style="font-size:10px; color:#8a8980; line-height:1.7;">${escapeHtml(c.ignore)}</div>
              <div align="center" style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#b0afa6; text-transform:uppercase; margin-top:14px; text-align:center;">Green Card Tracker · JMJ · 2026 · travel.state.gov</div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    c.title,
    '',
    c.body,
    '',
    `${c.cta}: ${confirmUrl}`,
    '',
    c.ignore,
    '',
    `${c.brand} · ${siteUrl}`,
  ].join('\n');

  return { subject: c.subject, html, text };
};
