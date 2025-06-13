const API_CONFIG_URL = {
    // ダッシュボードのデータ取得 & グラフ表示用 API
    'kyoritsu-dashboard': "https://script.google.com/macros/s/AKfycbwor8y2k5p2zXUcIj7rBnyn3Z_V4cTyEgcyGzGnvy_VgAjam2ymmMFJNy0xUvnTuzjt/exec",
    // 「水曜会」データ取得用 API
    'special-data': "https://script.google.com/macros/s/AKfycbyPikpNs-C043HCh9cLPIggbiZIgep44d31os8nCJtZPZz0KASzugNNbcVxThDRnjtfWA/exec"
}

const apiUrl = API_CONFIG_URL['kyoritsu-dashboard'];
const specialDataApiUrl = API_CONFIG_URL['special-data'];

// グラフデータを保存する変数（リサイズ時の再描画用）
let latestChartData = null;


/**
 * 指定されたURLからデータを取得してJSONとして返す
 * @param {string} url - データを取得するURL
 * @param {Object} options - fetchのオプション設定
 * @returns {Promise<Object>} 取得したJSONデータ
 * @throws {Error} HTTP通信エラーまたはJSONパースエラー時
 */
async function fetchApiData(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP エラー: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("❌ データ取得エラー:", error);
        throw error;
    }
}


/**
 * 水曜会カードのコンテンツを生成する
 * @param {string} data - 水曜会のデータ
 * @returns {string} 生成されたHTMLコンテンツ
 */
function createSuiyokaiCardContent(data) {
    return `<strong>『水曜会 Top Down!』</strong><br>${data || "データなし"}`
}

/**
 * 経営戦略室のお知らせカードのコンテンツを生成する
 * @returns {string} 生成されたHTMLコンテンツ
 */
function createKeieiCardContent() {
    return `<div style="text-align:center; font-size:32px; font-weight:bold;">『お知らせ』</div><div style="text-align:left; font-size:24px; margin-top:10px;">・R8年度診療報酬改定に向けて議論がスタート<br>（急性期医療に関するテーマ）<br>・電子カルテ付属システム調査開始(DX推進室)<br>＊画像診断センター調査終了しました！</div>`;
}

/**
 * 特別データ（水曜会と経営戦略室のお知らせ）をダッシュボードに表示する
 * @param {Object} data - 表示する特別データ
 * @param {string} data.suiyokai - 水曜会のデータ
 */
function describeSpecialData(data) {
    const suiyokaiCardElement = document.getElementById("suiyokai-card");
    const keieiCardElement = document.getElementById("keiei-card");

    suiyokaiCardElement.innerHTML = createSuiyokaiCardContent(data.suiyokai);
    keieiCardElement.innerHTML = createKeieiCardContent();
}

/**
 * 特別データ（水曜会と経営戦略室のお知らせ）をAPIから取得する
 * @returns {Promise<void>}
 */
async function fetchSpecialData() {
    try {
        console.log("Fetching Special Data...");

        const result = await fetchApiData(specialDataApiUrl);

        console.log("Special Data Response:", result);

        if (!result || !result.specialData) {
            console.error("❌ APIから「水曜会」「経営戦略室の戦略」のデータを取得できませんでした");
            return;
        }

        // --- describeSpecialData関数で描画します。データをresultで渡します。
        describeSpecialData(result.specialData);

    } catch (error) {
        console.error("❌ 特別データ取得エラー:", error);
    }
}

// -- desribeSpercialDataと同様に、
// describeFecthData関数や埋め込むテンプレートを実装します

/**
 * APIから取得したデータをダッシュボードに表示する
 * @param {Object} result - APIレスポンスデータ
 * @param {Array<Object>} result.data - 時系列データの配列
 * @param {string} result.lastEditTime - 最終更新時刻
 */
function describeFetchData(result) {

    // データを保存（リサイズ時の再描画用）
    latestChartData = result;

    // 最新のデータを取得
    const latestData = result.data[result.data.length - 1];

    // 更新時刻を確実に取得するように修正
    let lastEditTime = result.lastEditTime ? new Date(result.lastEditTime) : null;
    let formattedTime = lastEditTime ? `${lastEditTime.getHours().toString().padStart(2, '0')}:${lastEditTime.getMinutes().toString().padStart(2, '0')}` : "--:--";

    // 日付フォーマット
    const formattedDate = latestData["日付"] ? formatDate(latestData["日付"]) : "日付不明";

    // 更新時刻を確実に表示
    document.getElementById("latest-date").innerHTML = `${formattedDate}<br><span class="update-time">更新時刻：${formattedTime}</span>`;

    document.querySelector(".dashboard .card:nth-child(1) strong").innerText = `${(latestData["病床利用率 (%)"] * 100).toFixed(1)}%`;
    document.querySelector(".dashboard .card:nth-child(2) strong").innerText = `${latestData["救急車搬入数"]}台`;
    document.querySelector(".dashboard .card:nth-child(3) strong").innerText = `${latestData["入院患者数"]}人`;
    document.querySelector(".dashboard .card:nth-child(4) strong").innerText = `${latestData["退院予定数"]}人`;
    document.querySelector(".dashboard .card:nth-child(5) strong").innerText = `${latestData["一般病棟在院数"]}/202 床`;
    document.querySelector(".dashboard .card:nth-child(6) strong").innerText = `${latestData["集中治療室在院数"]}/16 床`;
    document.querySelector(".dashboard .card:nth-child(7) strong").innerText = `${latestData["平均在院日数"]}日`;

    // グラフ描画（表示する期間を変更可能）
    const daysToShow = 14;
    const labels = result.data.slice(-daysToShow).map(item => formatDateForChart(item["日付"]));

    createChart("bedChart", "病床利用率 (%)", labels, result.data.map(item => item["病床利用率 (%)"] * 100), "blue", "％", 110);
    createChart("ambulanceChart", "救急車搬入数", labels, result.data.map(item => item["救急車搬入数"]), "red", "台");
    createChart("inpatientsChart", "入院患者数", labels, result.data.map(item => item["入院患者数"]), "green", "人");
    createChart("dischargesChart", "退院予定数", labels, result.data.map(item => item["退院予定数"]), "orange", "人");
    createChart("generalWardChart", "一般病棟在院数", labels, result.data.map(item => item["一般病棟在院数"]), "purple", "床");
    createChart("icuChart", "集中治療室在院数", labels, result.data.map(item => item["集中治療室在院数"]), "teal", "床");

    // 平均在院日数のグラフを追加
    createChart("averageStayChart", "平均在院日数", labels, result.data.slice(-daysToShow).map(item => item["平均在院日数"]), "darkblue", "日");
}

// ✅ データ取得 & グラフ表示
async function fetchData() {
    try {
        console.log("Fetching Data...");

        const result = await fetchApiData(apiUrl);
        console.log("API Response:", result);

        if (!result || !result.data || result.data.length === 0) {
            console.error("❌ データが取得できませんでした");
            return;
        }

        // --- describeFetchData関数で描画します。データをresultで渡します。
        describeFetchData(result);

    } catch (error) {
        console.error("❌ データ取得エラー:", error);
    }
}

// おそらくですが、フォントサイズの設定が逆向き（パソコンが小さく、タブレット→スマホに行けば大きくしたい）という意図に見えます
// ここでの文字の単位はピクセルです（パソコン上の1pxとスマホ上の1pxは実寸としてサイズが違います）
// ひとまずすべて同じフォントサイズにいったんそろえます
function getCanvasResponsiveFontSize() {

    // 画面幅を取得
    const screenWidth = window.innerWidth;

    // 画面幅に応じてフォントサイズを返す
    if (screenWidth > 1200) {
        // PC向け
        return {
            // titleFontSize: 62,
            titleFontSize: 25,
            // axisTitleFontSize: 46,
            axisTitleFontSize: 18,
            // axisLabelFontSize: 40
            axisLabelFontSize: 16
        };
    } else if (screenWidth > 768) {
        // タブレット向け
        return {
            titleFontSize: 25,
            axisTitleFontSize: 18,
            axisLabelFontSize: 16
        };
    } else {
        // スマホ向け
        return {
            titleFontSize: 25,
            axisTitleFontSize: 18,
            axisLabelFontSize: 16
        };
    }
}


// このグラフ表示ではブラウザのリサイズに対応していません
// そのためcanvas要素のサイズが変更された場合、グラフの描画がおかしくなってしまいます
// 今回はブラウザのリサイズを検知→カード部分を再描画することにより、グラフの描画を再実行します
/**
 * すべてのグラフを再描画する関数
 */
function redrawAllCharts() {
    // データが存在しない場合は何もしない
    if (!latestChartData) return;

    // describeFetchData関数を再実行してグラフを再描画
    describeFetchData(latestChartData);
}

// ✅ グラフ作成関数（フォントサイズを動的に変更）
function createChart(canvasId, label, labels, data, color, unit, maxY = null) {
    const canvas = document.getElementById(canvasId);

    // ✅ 既存のグラフがある場合は削除（エラー防止）
    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    // screenWidthの取得とtitleFontSize, axisTitleFontsize, axisLabelFontSizeは
    // 画面幅を取得しそれらに応じてフォントサイズを返す関数に変更したほうが良いです

    // getCanvasResponsiveFontSize関数を使用してフォントサイズを取得します
    // const の後に{*,*}と続けると配列で返したキーにある変数を取得できます
    // これは分割代入と呼ばれるものです：（よく使われます）
    // https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring
    const { titleFontSize, axisTitleFontSize, axisLabelFontSize } = getCanvasResponsiveFontSize();


    // ✅ 画面幅に応じたフォントサイズの調整（適切な範囲で変更）
    // let screenWidth = window.innerWidth;
    // let titleFontSize, axisTitleFontSize, axisLabelFontSize;

    // if (screenWidth > 1200) {
    //     // PC向け
    //     titleFontSize = 62;
    //     axisTitleFontSize = 46;
    //     axisLabelFontSize = 40;
    // } else if (screenWidth > 768) {
    //     // タブレット向け
    //     titleFontSize = 25;
    //     axisTitleFontSize = 18;
    //     axisLabelFontSize = 16;
    // } else {
    //     // スマホ向け
    //     titleFontSize = 25;
    //     axisTitleFontSize = 18;
    //     axisLabelFontSize = 16;
    // }

    // ✅ 新しいグラフを作成し、インスタンスを保存
    canvas.chartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                data: data,
                borderColor: color,
                backgroundColor: color,
                fill: false,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: label,
                    font: { size: titleFontSize } // ✅ `weight` を削除
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: maxY,
                    title: {
                        display: true,
                        text: unit,
                        font: { size: axisTitleFontSize }
                    },
                    ticks: { font: { size: axisLabelFontSize } }
                },
                x: {
                    ticks: { font: { size: axisLabelFontSize } }
                }
            }
        }
    });
}

// これはリサイズ時に描画を少し遅らせるための関数です
// すなわちウィンドウの幅が変わりつづけている間は処理を遅らせて、描画のコストを減らします
function debounce(fn, delay = 200) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// リサイズ時は'resize'イベントを検知して、debounce関数で処理を遅らせつつ、redrawAllCharts関数を実行します
window.addEventListener('resize', debounce(() => {
    redrawAllCharts();
}, 200));


// ✅ 日付フォーマット関数
function formatDate(dateString) {
    if (!dateString) return "日付不明";
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
}

// ✅ 時刻フォーマット関数
function formatTime(dateString) {
    if (!dateString) return "--:--";
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// ✅ グラフ用の日付フォーマット
function formatDateForChart(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function openExternalLink(url) {
    window.open(url, '_blank');
}

// ✅ 初期化
fetchData();
fetchSpecialData();  // ✅ 「水曜会」「経営戦略室の戦略」のデータ取得も実行




