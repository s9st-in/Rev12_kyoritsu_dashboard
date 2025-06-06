// 今後の展開を踏まえて、まずはURLエンドポイントを定数として書き出しましょう。
const API_CONFIG_URL = {
    // ダッシュボードのデータ取得 & グラフ表示用 API
    'kyoritsu-dashboard': "https://script.google.com/macros/s/AKfycbwor8y2k5p2zXUcIj7rBnyn3Z_V4cTyEgcyGzGnvy_VgAjam2ymmMFJNy0xUvnTuzjt/exec",
    'special-data': "https://script.google.com/macros/s/AKfycbyPikpNs-C043HCh9cLPIggbiZIgep44d31os8nCJtZPZz0KASzugNNbcVxThDRnjtfWA/exec"
}

// メモ：今回はこれまでの文法の構造を維持するため、apiUrl、specialDataApiUrlはそのまま使います。
const apiUrl = API_CONFIG_URL['kyoritsu-dashboard'];
const specialDataApiUrl = API_CONFIG_URL['special-data'];

// 「水曜会や経営戦略室の戦略」「共立病院ダッシュボード」のデータ取得には、
// 共通してfetchAPIを用いています。処理の手順もほぼ同様です。
// まずはこのデータ取得部分のみをまとめて、関数に切り出してみましょう。
// fetchAPIによるURLの呼び出しには時間がかかります。
// この処理は非同期なのでasync関数としてください。fetchApiData関数を定義します。

// fetchApiData関数は、取得したいデータのurlを指定します。
// 第2引数の内容はoptions.*（のキーワード引数）としてfetchAPI取得のオプションとして渡されます。
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

// ✅ 「水曜会」「経営戦略室の戦略」のデータ取得
async function fetchSpecialData() {
    try {
        console.log("Fetching Special Data...");
        // 先ほど追加したfetchApiDataを用います
        const result = await fetchApiData(specialDataApiUrl);
        // -- ↓ 元のこの定義はfetchAPiDataで行われます
        // const response = await fetch(specialDataApiUrl);

        // if (!response.ok) {
        //     throw new Error(`HTTP エラー: ${response.status}`);
        // }

        // const result = await response.json();
        console.log("Special Data Response:", result);

        if (!result || !result.specialData) {
            console.error("❌ APIから「水曜会」「経営戦略室の戦略」のデータを取得できませんでした");
            return;
        }

        // ✅ タイトルを維持しながらデータを左詰めで表示　　*2025.5.28 「経営戦略室より」を追加
        // ✅ 『』を追加し、左詰めに設定
        document.getElementById("suiyokai-card").innerHTML = `<strong>『水曜会 Top Down!』</strong><br>${result.specialData.suiyokai || "データなし"}`;
        document.getElementById("keiei-card").innerHTML = `<div style="text-align:center; font-size:32px; font-weight:bold;">『お知らせ』</div>
 　　　 <div style="text-align:left; font-size:24px; margin-top:10px;">・R8年度診療報酬改定に向けて議論がスタート<br>
   　　 （急性期医療に関するテーマ）<br>・電子カルテ付属システム調査開始(DX推進室)<br>＊画像診断センター調査終了しました！</div>`;



        // ✅ 水曜会カードのサイズを変更（横幅と高さを指定）
        document.getElementById("suiyokai-card").style.width = "680px";  // 横幅
        document.getElementById("suiyokai-card").style.height = "220px"; // 高さ
        document.getElementById("suiyokai-card").style.textAlign = "left"; // 左詰め表示

        // ✅ 経営戦略カードのサイズを変更（横幅と高さを指定）
        document.getElementById("keiei-card").style.width = "680px";  // 横幅
        document.getElementById("keiei-card").style.height = "220px"; // 高さ
        document.getElementById("keiei-card").style.textAlign = "left"; // 左詰め表示


    } catch (error) {
        console.error("❌ 特別データ取得エラー:", error);
    }
}

// ✅ データ取得 & グラフ表示
async function fetchData() {
    try {
        console.log("Fetching Data...");
        // 元の実装 ---
        // const response = await fetch(apiUrl);
        // if (!response.ok) {
        //     throw new Error(`HTTP エラー: ${response.status}`);
        // }
        
        // fetchApiDataで取得するよう（置き換えます）
        const result = await fetchApiData(apiUrl);
        console.log("API Response:", result);

        if (!result || !result.data || result.data.length === 0) {
            console.error("❌ データが取得できませんでした");
            return;
        }

        const latestData = result.data[result.data.length - 1];

        // ✅ 更新時刻を確実に取得するように修正
        let lastEditTime = result.lastEditTime ? new Date(result.lastEditTime) : null;
        let formattedTime = lastEditTime ? `${lastEditTime.getHours().toString().padStart(2, '0')}:${lastEditTime.getMinutes().toString().padStart(2, '0')}` : "--:--";

        // ✅ 日付フォーマット
        const formattedDate = latestData["日付"] ? formatDate(latestData["日付"]) : "日付不明";

        // ✅ 更新時刻を確実に表示
        document.getElementById("latest-date").innerHTML = `${formattedDate}<br><span class="update-time">更新時刻：${formattedTime}</span>`;

        // ✅ フォントサイズを大きく
        document.getElementById("latest-date").style.fontSize = "30px";


        // ✅ ダッシュボードデータの表示
        document.querySelectorAll(".dashboard .card").forEach(card => {
            card.style.fontSize = "28px";
        });

        document.querySelector(".dashboard .card:nth-child(1) strong").innerText = `${(latestData["病床利用率 (%)"] * 100).toFixed(1)}%`;
        document.querySelector(".dashboard .card:nth-child(2) strong").innerText = `${latestData["救急車搬入数"]}台`;
        document.querySelector(".dashboard .card:nth-child(3) strong").innerText = `${latestData["入院患者数"]}人`;
        document.querySelector(".dashboard .card:nth-child(4) strong").innerText = `${latestData["退院予定数"]}人`;
        document.querySelector(".dashboard .card:nth-child(5) strong").innerText = `${latestData["一般病棟在院数"]}/202 床`;
        document.querySelector(".dashboard .card:nth-child(6) strong").innerText = `${latestData["集中治療室在院数"]}/16 床`;
        document.querySelector(".dashboard .card:nth-child(7) strong").innerText = `${latestData["平均在院日数"]}日`; // 追加


        // ✅ グラフ描画（表示する期間を変更可能）
        const daysToShow = 14; // ← 変更する期間（例: 14日分を表示）
        const labels = result.data.slice(-daysToShow).map(item => formatDateForChart(item["日付"]));

        createChart("bedChart", "病床利用率 (%)", labels, result.data.map(item => item["病床利用率 (%)"] * 100), "blue", "％", 110);
        createChart("ambulanceChart", "救急車搬入数", labels, result.data.map(item => item["救急車搬入数"]), "red", "台");
        createChart("inpatientsChart", "入院患者数", labels, result.data.map(item => item["入院患者数"]), "green", "人");
        createChart("dischargesChart", "退院予定数", labels, result.data.map(item => item["退院予定数"]), "orange", "人");
        createChart("generalWardChart", "一般病棟在院数", labels, result.data.map(item => item["一般病棟在院数"]), "purple", "床");
        createChart("icuChart", "集中治療室在院数", labels, result.data.map(item => item["集中治療室在院数"]), "teal", "床");

        // ✅ 平均在院日数のグラフを追加（場合によっては改修検討）
        createChart("averageStayChart", "平均在院日数", labels, result.data.slice(-daysToShow).map(item => item["平均在院日数"]), "darkblue", "日");


    } catch (error) {
        console.error("❌ データ取得エラー:", error);
    }
}

// index.htmlとscript.jsに同様の定義がありました
// 二重で呼び出しているので、index.htmlのhtml要素のonclick属性（イベント属性）に記述をまとめたほうがよいでしょう
// index.htmlで呼び出していたURLとscript.jsで呼び出しているURLが微妙に違うようなので、意図と合っているが動作を確認されてみてください。

// // ✅ 手術台帳を開くクリックイベント
// document.getElementById('surgery-register-card').addEventListener('click', function () {
//     window.open('https://docs.google.com/spreadsheets/d/1CHU8Cgxgg5IvL3nB6ackAdqxe7-CNkmWDvtYE-keuXI/preview?rm=minimal');
// });

// // ✅ 当直管理表を開くクリックイベント（新規追加）
// document.getElementById('duty-management-card').addEventListener('click', function () {
//     window.open('https://docs.google.com/spreadsheets/d/e/2PACX-1vTfU1BN4pPg9rY9INF2Kea_OIq1Bya875QFvAmi87uRGYw1t3pH69Lx0msXIbbLtZ0XZqYMtJYsrIrR/pubhtml?gid=0&single=true');
// });

// // ✅ 新型コロナ感染状況を開くクリックイベント（新規追加）
// document.getElementById('covid-status-card').addEventListener('click', function () {
//     window.open('https://docs.google.com/spreadsheets/d/1pgLCwJPxPpGO_-ro_J78QYqLzjrGHgTBKHL3ngybBbY/edit?gid=0#gid=0');
// });

// // ✅ メディサイナスイメージを開くクリックイベント（新規追加）
// document.getElementById('new-card').addEventListener('click', function () {
//     window.open('https://docs.google.com/spreadsheets/d/16G6LfsDQSD_ogAPDSj6cL4LpVGWFsZxnhdp_GfZA7e8/preview?rm=minimal');
// });


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

// カードをクリックして新しく開く部分のコードは、URL以外は定義の変わらないコートです
// script.js内にopenExternalLink()を記述しました。
// イベントハンドラはDOM（id要素を示すセレクタ）からだけでなく、HTML属性内に記述することができます
// clickイベントの場合はhtml要素のonclick属性としてJavaScriptの式を呼び出すことができます。
// コードリファクタリングの観点から、今回はhtml要素のonClick属性を使うほうがスマートでしょう。

function openExternalLink(url) {
    window.open(url, '_blank');
}

// ✅ 初期化
fetchData();
fetchSpecialData();  // ✅ 「水曜会」「経営戦略室の戦略」のデータ取得も実行

// ✅ タイトルのフォントサイズ変更
document.querySelector("h1.left-align").style.fontSize = "32px"; // ← フォントサイズを変更



