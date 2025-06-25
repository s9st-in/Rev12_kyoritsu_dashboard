/**
 * 戸畑共立病院ダッシュボード
 * リファクタリング版 - エラーハンドリング、アクセシビリティ、コード整理を改善
 */

// ✅ 設定をオブジェクトにまとめてグローバル変数を削減
const DashboardConfig = {
    API_URLS: {
        dashboard: "https://script.google.com/macros/s/AKfycbwor8y2k5p2zXUcIj7rBnyn3Z_V4cTyEgcyGzGnvy_VgAjam2ymmMFJNy0xUvnTuzjt/exec",
        specialData: "https://script.google.com/macros/s/AKfycbyPikpNs-C043HCh9cLPIggbiZIgep44d31os8nCJtZPZz0KASzugNNbcVxThDRnjtfWA/exec"
    },
    CHART_SETTINGS: {
        daysToShow: 14,
        defaultHeight: 350,
        debounceDelay: 200
    },
    RETRY_SETTINGS: {
        maxRetries: 3,
        retryDelay: 2000
    }
};

// ✅ アプリケーション状態を管理するオブジェクト
const AppState = {
    latestChartData: null,
    isLoading: false,
    retryCount: 0
};


/**
 * ✅ ユーザー通知機能
 */
const NotificationManager = {
    /**
     * 通知を表示する
     * @param {string} message - 表示するメッセージ
     * @param {string} type - 通知タイプ ('error' | 'success' | 'info')
     * @param {number} duration - 表示時間（ミリ秒）
     */
    show(message, type = 'error', duration = 5000) {
        // 既存の通知を削除
        this.clear();

        const notification = document.createElement('div');
        notification.className = `error-notification ${type === 'success' ? 'success' : ''}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        notification.innerHTML = `
            ${message}
            <button class="close-btn" aria-label="通知を閉じる">&times;</button>
        `;

        document.body.appendChild(notification);

        // 閉じるボタンのイベントリスナー
        const closeBtn = notification.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.clear());

        // 自動削除
        if (duration > 0) {
            setTimeout(() => this.clear(), duration);
        }
    },

    /**
     * 通知を削除する
     */
    clear() {
        const existing = document.querySelector('.error-notification');
        if (existing) {
            existing.remove();
        }
    }
};

/**
 * ✅ 改善されたAPI取得関数（リトライ機能付き）
 * @param {string} url - データを取得するURL
 * @param {Object} options - fetchのオプション設定
 * @param {number} retryCount - 現在のリトライ回数
 * @returns {Promise<Object>} 取得したJSONデータ
 */
async function fetchApiData(url, options = {}, retryCount = 0) {
    try {
        const response = await fetch(url, {
            ...options,
            timeout: 10000 // 10秒タイムアウト
        });
        
        if (!response.ok) {
            throw new Error(`HTTP エラー: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 成功時はリトライカウントをリセット
        AppState.retryCount = 0;
        
        return data;
    } catch (error) {
        console.error(`❌ データ取得エラー (試行 ${retryCount + 1}/${DashboardConfig.RETRY_SETTINGS.maxRetries}):`, error);
        
        // リトライ処理
        if (retryCount < DashboardConfig.RETRY_SETTINGS.maxRetries - 1) {
            NotificationManager.show(
                `データ取得に失敗しました。${DashboardConfig.RETRY_SETTINGS.retryDelay / 1000}秒後に再試行します...`,
                'error',
                DashboardConfig.RETRY_SETTINGS.retryDelay
            );
            
            await new Promise(resolve => setTimeout(resolve, DashboardConfig.RETRY_SETTINGS.retryDelay));
            return fetchApiData(url, options, retryCount + 1);
        } else {
            // 最大リトライ回数に達した場合
            const errorMessage = `データの取得に失敗しました。ネットワーク接続を確認してページを再読み込みしてください。\nエラー: ${error.message}`;
            NotificationManager.show(errorMessage, 'error', 0); // 手動で閉じるまで表示
            throw error;
        }
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

    // DOM要素の存在確認
    if (suiyokaiCardElement) {
        suiyokaiCardElement.innerHTML = createSuiyokaiCardContent(data.suiyokai);
    }
    if (keieiCardElement) {
        keieiCardElement.innerHTML = createKeieiCardContent();
    }
}

/**
 * ✅ 改善された特別データ取得関数
 * @returns {Promise<void>}
 */
async function fetchSpecialData() {
    if (AppState.isLoading) {
        console.log("既にデータ取得中のため、スキップします");
        return;
    }

    try {
        AppState.isLoading = true;
        console.log("特別データを取得中...");

        const result = await fetchApiData(DashboardConfig.API_URLS.specialData);

        console.log("特別データ取得成功:", result);

        if (!result || !result.specialData) {
            throw new Error("APIから特別データを取得できませんでした");
        }

        describeSpecialData(result.specialData);
        
        // 成功通知（開発時のみ表示、本番では削除可能）
        if (process?.env?.NODE_ENV === 'development') {
            NotificationManager.show("特別データの取得が完了しました", 'success', 2000);
        }

    } catch (error) {
        console.error("❌ 特別データ取得エラー:", error);
        NotificationManager.show(
            "特別データの取得に失敗しました。一部の情報が表示されない可能性があります。",
            'error',
            5000
        );
    } finally {
        AppState.isLoading = false;
    }
}

/**
 * ✅ 改善されたグラフ描画関数
 * @param {Object} result - APIレスポンスデータ
 * @param {Array<Object>} result.data - 時系列データの配列
 */
function drawCharts(result) {
    try {
        if (!result || !result.data || !Array.isArray(result.data)) {
            throw new Error("グラフデータが無効です");
        }

        const { daysToShow } = DashboardConfig.CHART_SETTINGS;
        const recentData = result.data.slice(-daysToShow);
        const labels = recentData.map(item => formatDateForChart(item["日付"]));

        // グラフ設定の配列（保守性向上）
        const chartConfigs = [
            {
                id: "bedChart",
                title: "病床利用率 (%)",
                data: result.data.map(item => item["病床利用率 (%)"] * 100),
                color: "blue",
                unit: "％",
                maxY: 110
            },
            {
                id: "ambulanceChart",
                title: "救急車搬入数",
                data: result.data.map(item => item["救急車搬入数"]),
                color: "red",
                unit: "台"
            },
            {
                id: "inpatientsChart",
                title: "入院患者数",
                data: result.data.map(item => item["入院患者数"]),
                color: "green",
                unit: "人"
            },
            {
                id: "dischargesChart",
                title: "退院予定数",
                data: result.data.map(item => item["退院予定数"]),
                color: "orange",
                unit: "人"
            },
            {
                id: "generalWardChart",
                title: "一般病棟在院数",
                data: result.data.map(item => item["一般病棟在院数"]),
                color: "purple",
                unit: "床"
            },
            {
                id: "icuChart",
                title: "集中治療室在院数",
                data: result.data.map(item => item["集中治療室在院数"]),
                color: "teal",
                unit: "床"
            },
            {
                id: "averageStayChart",
                title: "平均在院日数",
                data: recentData.map(item => item["平均在院日数"]),
                color: "darkblue",
                unit: "日"
            }
        ];

        // 各グラフを作成
        chartConfigs.forEach(config => {
            createChart(
                config.id,
                config.title,
                labels,
                config.data,
                config.color,
                config.unit,
                config.maxY
            );
        });

        console.log("✅ 全グラフの描画が完了しました");

    } catch (error) {
        console.error("❌ グラフ描画エラー:", error);
        NotificationManager.show(
            "グラフの描画に失敗しました。データに問題がある可能性があります。",
            'error',
            5000
        );
    }
}

/**
 * ✅ 改善されたデータ表示関数
 * @param {Object} result - APIレスポンスデータ
 * @param {Array<Object>} result.data - 時系列データの配列
 * @param {string} result.lastEditTime - 最終更新時刻
 */
function describeFetchData(result) {
    try {
        // データを保存（リサイズ時の再描画用）
        AppState.latestChartData = result;

        // 最新のデータを取得
        const latestData = result.data[result.data.length - 1];
        if (!latestData) {
            throw new Error("最新データが見つかりません");
        }

        // 更新時刻を確実に取得するように修正
        let lastEditTime = result.lastEditTime ? new Date(result.lastEditTime) : null;
        let formattedTime = lastEditTime ? 
            `${lastEditTime.getHours().toString().padStart(2, '0')}:${lastEditTime.getMinutes().toString().padStart(2, '0')}` : 
            "--:--";

        // 日付フォーマット
        const formattedDate = latestData["日付"] ? formatDate(latestData["日付"]) : "日付不明";

        // DOM要素の存在確認と更新
        const dateElement = document.getElementById("latest-date");
        if (dateElement) {
            dateElement.innerHTML = `${formattedDate}　<span class="update-time">更新時刻：${formattedTime} </span>`;
        }

        // メトリクス更新（エラーハンドリング付き）
        const metrics = [
            { selector: "[data-metric='bed-utilization'] strong", value: `${(latestData["病床利用率 (%)"] * 100).toFixed(1)}%` },
            { selector: "[data-metric='ambulance'] strong", value: `${latestData["救急車搬入数"]}台` },
            { selector: "[data-metric='inpatients'] strong", value: `${latestData["入院患者数"]}人` },
            { selector: "[data-metric='discharges'] strong", value: `${latestData["退院予定数"]}人` },
            { selector: "[data-metric='general-ward'] strong", value: `${latestData["一般病棟在院数"]}/202 床` },
            { selector: "[data-metric='icu'] strong", value: `${latestData["集中治療室在院数"]}/16 床` },
            { selector: "[data-metric='average-stay'] strong", value: `${latestData["平均在院日数"]}日` }
        ];

        metrics.forEach(metric => {
            const element = document.querySelector(metric.selector);
            if (element) {
                element.innerText = metric.value;
            } else {
                console.warn(`⚠️ 要素が見つかりません: ${metric.selector}`);
            }
        });

        // グラフ描画を分離した関数で実行
        drawCharts(result);

        console.log("✅ ダッシュボードデータの更新が完了しました");

    } catch (error) {
        console.error("❌ データ表示エラー:", error);
        NotificationManager.show(
            "データの表示に失敗しました。データ形式に問題がある可能性があります。",
            'error',
            5000
        );
    }
}

/**
 * ✅ 改善されたメインデータ取得関数
 * @returns {Promise<void>}
 */
async function fetchData() {
    if (AppState.isLoading) {
        console.log("既にデータ取得中のため、スキップします");
        return;
    }

    try {
        AppState.isLoading = true;
        console.log("ダッシュボードデータを取得中...");

        const result = await fetchApiData(DashboardConfig.API_URLS.dashboard);
        console.log("ダッシュボードデータ取得成功:", result);

        if (!result || !result.data || !Array.isArray(result.data) || result.data.length === 0) {
            throw new Error("有効なデータが取得できませんでした");
        }

        describeFetchData(result);

        // 成功通知（開発時のみ表示、本番では削除可能）
        if (process?.env?.NODE_ENV === 'development') {
            NotificationManager.show("ダッシュボードデータの取得が完了しました", 'success', 2000);
        }

    } catch (error) {
        console.error("❌ ダッシュボードデータ取得エラー:", error);
        NotificationManager.show(
            "ダッシュボードデータの取得に失敗しました。しばらく待ってから再読み込みしてください。",
            'error',
            8000
        );
    } finally {
        AppState.isLoading = false;
    }
}

/**
 * 画面幅に応じたグラフのフォントサイズを返す
 * @returns {Object} タイトル、軸タイトル、軸ラベルのフォントサイズを含むオブジェクト
 */
function getCanvasResponsiveFontSize() {
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


/**
 * ✅ 改善されたグラフ再描画関数
 * @returns {void}
 */
function redrawAllCharts() {
    try {
        // データが存在しない場合は何もしない
        if (!AppState.latestChartData) {
            console.log('再描画スキップ - データがまだ読み込まれていません');
            return;
        }

        console.log('グラフを再描画中...');
        // グラフのみを再描画（数値データの再表示は行わない）
        drawCharts(AppState.latestChartData);
        console.log('✅ グラフの再描画が完了しました');

    } catch (error) {
        console.error('❌ グラフ再描画エラー:', error);
        NotificationManager.show(
            'グラフの再描画に失敗しました。',
            'error',
            3000
        );
    }
}

// ✅ グラフ作成関数（フォントサイズを動的に変更）
function createChart(canvasId, label, labels, data, color, unit, maxY = null) {
    const canvas = document.getElementById(canvasId);
    
    // Canvas要素の存在確認
    if (!canvas) {
        console.warn(`⚠️ Canvas要素が見つかりません: ${canvasId}`);
        return;
    }

    // ✅ 既存のグラフがある場合は削除（エラー防止）
    if (canvas.chartInstance) {
        canvas.chartInstance.destroy();
    }

    const { titleFontSize, axisTitleFontSize, axisLabelFontSize } = getCanvasResponsiveFontSize();

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

/**
 * 関数の実行を遅延させるデバウンス関数
 * @param {Function} fn - 実行する関数
 * @param {number} [delay=200] - 遅延時間（ミリ秒）
 * @returns {Function} デバウンスされた関数
 */
function debounce(fn, delay = 200) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
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

/**
 * ✅ イベントリスナー管理オブジェクト
 */
const EventManager = {
    /**
     * クリック可能なカードのイベントリスナーを設定
     */
    setupClickableCards() {
        const clickableCards = document.querySelectorAll('.clickable-card');
        
        clickableCards.forEach(card => {
            const url = card.dataset.url;
            if (!url) {
                console.warn('⚠️ data-url属性が見つかりません:', card.id);
                return;
            }

            // クリックイベント
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.openExternalLink(url);
            });

            // キーボードイベント（アクセシビリティ対応）
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openExternalLink(url);
                }
            });
        });

        console.log(`✅ ${clickableCards.length}個のクリック可能なカードにイベントリスナーを設定しました`);
    },

    /**
     * 外部リンクを新しいタブで開く
     * @param {string} url - 開くURL
     */
    openExternalLink(url) {
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
            console.log(`✅ 外部リンクを開きました: ${url}`);
        } catch (error) {
            console.error('❌ 外部リンクを開けませんでした:', error);
            NotificationManager.show(
                'リンクを開くことができませんでした。',
                'error',
                3000
            );
        }
    },

    /**
     * リサイズイベントリスナーを設定
     */
    setupResizeListener() {
        window.addEventListener('resize', debounce(() => {
            console.log('リサイズイベント発生 - グラフを再描画します');
            redrawAllCharts();
        }, DashboardConfig.CHART_SETTINGS.debounceDelay));

        console.log('✅ リサイズイベントリスナーを設定しました');
    }
};

/**
 * ✅ アプリケーション初期化関数
 */
async function initializeApp() {
    try {
        console.log('🚀 アプリケーションを初期化中...');

        // イベントリスナーの設定
        EventManager.setupClickableCards();
        EventManager.setupResizeListener();

        // データ取得の開始
        await Promise.allSettled([
            fetchData(),
            fetchSpecialData()
        ]);

        console.log('✅ アプリケーションの初期化が完了しました');

    } catch (error) {
        console.error('❌ アプリケーション初期化エラー:', error);
        NotificationManager.show(
            'アプリケーションの初期化に失敗しました。ページを再読み込みしてください。',
            'error',
            0
        );
    }
}

// ✅ DOMが読み込まれた後に初期化を実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
