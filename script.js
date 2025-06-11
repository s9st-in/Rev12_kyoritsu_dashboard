const API_CONFIG_URL = {
    // ダッシュボードのデータ取得 & グラフ表示用 API
    'kyoritsu-dashboard': "https://script.google.com/macros/s/AKfycbwor8y2k5p2zXUcIj7rBnyn3Z_V4cTyEgcyGzGnvy_VgAjam2ymmMFJNy0xUvnTuzjt/exec",
    // 「水曜会」データ取得用 API
    'special-data': "https://script.google.com/macros/s/AKfycbyPikpNs-C043HCh9cLPIggbiZIgep44d31os8nCJtZPZz0KASzugNNbcVxThDRnjtfWA/exec"
}

const apiUrl = API_CONFIG_URL['kyoritsu-dashboard'];
const specialDataApiUrl = API_CONFIG_URL['special-data'];


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


// 関数は必要以上に長くならないよう、責務を考えつつ分割するのが基本です
// 今回は「ダッシュボード」「水曜会」のDOM描画に用いる部分をそれぞれ分割してみましょう


// document.getElementById("suiyokai-card").innerHTML = `<strong>『水曜会 Top Down!』</strong><br>${result.specialData.suiyokai || "データなし"}`;
//         document.getElementById("keiei-card").innerHTML = `<div style="text-align:center; font-size:32px; font-weight:bold;">『お知らせ』</div>
//  　　　 <div style="text-align:left; font-size:24px; margin-top:10px;">・R8年度診療報酬改定に向けて議論がスタート<br>
//    　　 （急性期医療に関するテーマ）<br>・電子カルテ付属システム調査開始(DX推進室)<br>＊画像診断センター調査終了しました！</div>`;

// 後で困ったことになるので、document.getElementByIdで取得したDOMノードが先にいったん変数に格納してしまいましょう。

// document.getElementById().innerHTMLで挿入するHTMLは関数で取得できるようにしましょう
// -- createSuiyoukaiCardContent関数 … 水曜会
// -- createKeieiCardContent関数 … 経営戦略室

// dataはresult.specialData.suiyokai（水曜会のデータ）を期待しています
function createSuiyokaiCardContent(data) {
    return `<strong>『水曜会 Top Down!』</strong><br>${data || "データなし"}`
}

function createKeieiCardContent() {
    return `<div style="text-align:center; font-size:32px; font-weight:bold;">『お知らせ』</div><div style="text-align:left; font-size:24px; margin-top:10px;">・R8年度診療報酬改定に向けて議論がスタート<br>（急性期医療に関するテーマ）<br>・電子カルテ付属システム調査開始(DX推進室)<br>＊画像診断センター調査終了しました！</div>`;
}

function describeSpecialData(data) {

    // -- DOM要素を探してくる部分と、.innerHTMLで注入する部分を分けます

    const suiyokaiCardElement = document.getElementById("suiyokai-card");
    const keieiCardElement = document.getElementById("keiei-card");

    suiyokaiCardElement.innerHTML = createSuiyokaiCardContent(data.suiyokai);
    keieiCardElement.innerHTML = createKeieiCardContent();
    
}

// ✅ 「水曜会」「経営戦略室の戦略」のデータ取得
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


        // ✅ タイトルを維持しながらデータを左詰めで表示　　*2025.5.28 「経営戦略室より」を追加
        // ✅ 『』を追加し、左詰めに設定
//         document.getElementById("suiyokai-card").innerHTML = createSuiyokaiCardContent(result.specialData.suiyokai);
//         document.getElementById("keiei-card").innerHTML = `<div style="text-align:center; font-size:32px; font-weight:bold;">『お知らせ』</div>
//  　　　 <div style="text-align:left; font-size:24px; margin-top:10px;">・R8年度診療報酬改定に向けて議論がスタート<br>
//    　　 （急性期医療に関するテーマ）<br>・電子カルテ付属システム調査開始(DX推進室)<br>＊画像診断センター調査終了しました！</div>`;

        // よほどの必要性がない限り、JavaScript側からのstyle属性変更は避けたほうがいいです
        // （CSS: style.cssの定義と衝突します）

        // → style.cssの定義を変更します


        // // ✅ 水曜会カードのサイズを変更（横幅と高さを指定）
        // document.getElementById("suiyokai-card").style.width = "680px";  // 横幅
        // document.getElementById("suiyokai-card").style.height = "220px"; // 高さ
        // document.getElementById("suiyokai-card").style.textAlign = "left"; // 左詰め表示

        // // ✅ 経営戦略カードのサイズを変更（横幅と高さを指定）
        // document.getElementById("keiei-card").style.width = "680px";  // 横幅
        // document.getElementById("keiei-card").style.height = "220px"; // 高さ
        // document.getElementById("keiei-card").style.textAlign = "left"; // 左詰め表示


    } catch (error) {
        console.error("❌ 特別データ取得エラー:", error);
    }
}

// -- desribeSpercialDataと同様に、
// describeFecthData関数や埋め込むテンプレートを実装します

function describeFetchData(result) {
    const latestData = result.data[result.data.length - 1];

    // 更新時刻を確実に取得するように修正
    let lastEditTime = result.lastEditTime ? new Date(result.lastEditTime) : null;
    let formattedTime = lastEditTime ? `${lastEditTime.getHours().toString().padStart(2, '0')}:${lastEditTime.getMinutes().toString().padStart(2, '0')}` : "--:--";

    // 日付フォーマット
    const formattedDate = latestData["日付"] ? formatDate(latestData["日付"]) : "日付不明";

    // 更新時刻を確実に表示
    document.getElementById("latest-date").innerHTML = `${formattedDate}<br><span class="update-time">更新時刻：${formattedTime}</span>`;

    // フォントサイズを大きく
    document.getElementById("latest-date").style.fontSize = "30px";

    // ダッシュボードデータの表示
    document.querySelectorAll(".dashboard .card").forEach(card => {
        card.style.fontSize = "28px";
    });

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

// ✅ グラフ作成関数（フォントサイズを動的に変更）
function createChart(canvasId, label, labels, data, color, unit, maxY = null) {
    const canvas = document.getElementById(canvasId);

    // ✅ 既存のグラフがある場合は削除（エラー防止）
    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    // ✅ 画面幅に応じたフォントサイズの調整（適切な範囲で変更）
    let screenWidth = window.innerWidth;
    let titleFontSize, axisTitleFontSize, axisLabelFontSize;

    if (screenWidth > 1200) {
        // PC向け
        titleFontSize = 62;
        axisTitleFontSize = 46;
        axisLabelFontSize = 40;
    } else if (screenWidth > 768) {
        // タブレット向け
        titleFontSize = 25;
        axisTitleFontSize = 18;
        axisLabelFontSize = 16;
    } else {
        // スマホ向け
        titleFontSize = 25;
        axisTitleFontSize = 18;
        axisLabelFontSize = 16;
    }

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

// ✅ タイトルのフォントサイズ変更
document.querySelector("h1.left-align").style.fontSize = "32px"; // ← フォントサイズを変更



