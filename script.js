/**
 * 戸畑共立病院ダッシュボード
 * リファクタリング版 - エラーハンドリング、アクセシビリティ、コード整理を改善
 */

/**
 * ダッシュボード設定オブジェクト
 * API URL、グラフ設定、リトライ設定をまとめて管理
 * @constant {Object}
 */
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

/**
 * アプリケーション状態管理オブジェクト
 * グラフデータ、ローディング状態、リトライ回数などを管理
 * @constant {Object}
 */
const AppState = {
    latestChartData: null,
    isLoading: false,
    fetchingSpecialData: false,
    retryCount: 0
};


/**
 * ユーザー通知管理オブジェクト
 * エラーメッセージや成功通知の表示・削除を管理
 * @namespace NotificationManager
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
     * @memberof NotificationManager
     */
    clear() {
        const existing = document.querySelector('.error-notification');
        if (existing) {
            existing.remove();
        }
    }
};

/**
 * Google Apps Script APIからデータを取得する関数（リトライ機能付き）
 * AbortControllerでタイムアウト制御、CORS対応、最大3回までの自動リトライを実装
 * @param {string} url - データを取得するGoogle Apps ScriptのURL
 * @param {Object} [options={}] - fetchのオプション設定
 * @param {number} [retryCount=0] - 現在のリトライ回数（内部用）
 * @returns {Promise<Object>} 取得したJSONデータ
 * @throws {Error} 最大3回のリトライ後も失敗した場合
 * @example
 * const data = await fetchApiData('https://script.google.com/...', {}, 0);
 */
async function fetchApiData(url, options = {}, retryCount = 0) {
    // AbortControllerでタイムアウト制御
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            mode: 'cors',
            cache: 'no-cache'
        });
        
        // タイムアウトをクリア
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP エラー: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 成功時はリトライカウントをリセット
        AppState.retryCount = 0;
        
        return data;
    } catch (error) {
        // タイムアウトをクリア
        clearTimeout(timeoutId);
        
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'リクエストがタイムアウトしました';
        }
        
        console.error(`❌ データ取得エラー (試行 ${retryCount + 1}/${DashboardConfig.RETRY_SETTINGS.maxRetries}):`, errorMessage);
        
        // リトライ処理
        if (retryCount < DashboardConfig.RETRY_SETTINGS.maxRetries - 1) {
            console.log(`🔄 ${DashboardConfig.RETRY_SETTINGS.retryDelay / 1000}秒後にリトライします...`);
            await new Promise(resolve => setTimeout(resolve, DashboardConfig.RETRY_SETTINGS.retryDelay));
            return fetchApiData(url, options, retryCount + 1);
        } else {
            // 最大リトライ回数に達した場合 - 呼び出し元でエラーハンドリング
            throw new Error(errorMessage);
        }
    }
}


/**
 * 水曜会カードのコンテンツを生成する
 * 『水曜会 Top Down!』のタイトルとデータを含むHTMLを生成
 * @param {string|null} data - 水曜会のデータ（nullの場合は「データなし」を表示）
 * @returns {string} 生成されたHTMLコンテンツ
 */
function createSuiyokaiCardContent(data) {
    return `<strong>『水曜会 Top Down!』</strong><br>${data || "データなし"}`
}

/**
 * 経営戦略室のお知らせカードのコンテンツを生成する
 * 固定のお知らせ内容をHTML形式で返す（診療報酬改定、電子カルテ系統調査など）
 * @returns {string} 生成されたHTMLコンテンツ
 */
function createKeieiCardContent() {
    return `<div style="text-align:center; font-size:32px; font-weight:bold;">『お知らせ』</div><div style="text-align:left; font-size:24px; margin-top:10px;">・R8年度診療報酬改定に向けて議論がスタート<br>（急性期医療に関するテーマ）<br>・電子カルテ付属システム調査開始(DX推進室)<br>＊画像診断センター調査終了しました！</div>`;
}

/**
 * 特別データ（水曜会と経営戦略室のお知らせ）をダッシュボードに表示する
 * DOM要素の存在確認を行い、安全にHTMLコンテンツを更新する
 * @param {Object} data - 表示する特別データ
 * @param {string} data.suiyokai - 水曜会のデータ（空文字列またはnull可）
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
 * 特別データ（水曜会情報、経営戦略室お知らせ）をAPIから取得する
 * メインデータとは独立した状態管理で、失敗してもアプリ継続可能
 * @async
 * @returns {Promise<void>}
 * @throws {Error} APIからデータが取得できない場合
 */
async function fetchSpecialData() {
    // 特別データ用の個別ロック
    if (AppState.fetchingSpecialData) {
        console.log("既に特別データ取得中のため、スキップします");
        return;
    }

    try {
        AppState.fetchingSpecialData = true;
        console.log("特別データを取得中...");

        const result = await fetchApiData(DashboardConfig.API_URLS.specialData);

        console.log("特別データ取得成功:", result);

        if (!result || !result.specialData) {
            throw new Error("APIから特別データを取得できませんでした");
        }

        describeSpecialData(result.specialData);

    } catch (error) {
        console.error("❌ 特別データ取得エラー:", error);
        
        // 特別データは必須ではないため、控えめなエラー表示
        NotificationManager.show(
            "特別データの取得に失敗しました。一部の情報が表示されない場合があります。",
            'error',
            3000
        );
    } finally {
        AppState.fetchingSpecialData = false;
    }
}

/**
 * 病院メトリクスの時系列グラフをChart.jsで描画する
 * 14日分のデータで病床利用率、救急車搬入数などのグラフを一括生成
 * @param {Object} result - APIレスポンスデータ
 * @param {Array<Object>} result.data - 時系列データの配列（各オブジェクトに日付とメトリクスを含む）
 * @throws {Error} グラフデータが無効な場合
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
                data: recentData.map(item => item["病床利用率 (%)"] * 100),
                color: "blue",
                unit: "％",
                maxY: 110
            },
            {
                id: "ambulanceChart",
                title: "救急車搬入数",
                data: recentData.map(item => item["救急車搬入数"]),
                color: "red",
                unit: "台"
            },
            {
                id: "inpatientsChart",
                title: "入院患者数",
                data: recentData.map(item => item["入院患者数"]),
                color: "green",
                unit: "人"
            },
            {
                id: "dischargesChart",
                title: "退院予定数",
                data: recentData.map(item => item["退院予定数"]),
                color: "orange",
                unit: "人"
            },
            {
                id: "generalWardChart",
                title: "一般病棟在院数",
                data: recentData.map(item => item["一般病棟在院数"]),
                color: "purple",
                unit: "床"
            },
            {
                id: "icuChart",
                title: "集中治療室在院数",
                data: recentData.map(item => item["集中治療室在院数"]),
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
 * 取得した病院データをダッシュボードに表示する
 * 最新データを抽出し、日付・時刻フォーマット、メトリクス表示、グラフ描画を実行
 * @param {Object} result - APIレスポンスデータ
 * @param {Array<Object>} result.data - 時系列データの配列（日付、病床利用率などを含む）
 * @param {string} [result.lastEditTime] - 最終更新時刻（ISO文字列）
 * @throws {Error} 最新データが見つからない場合
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
 * メインダッシュボードデータをAPIから取得し、表示を更新する
 * 病院の主要な運営メトリクス（病床利用率、救急車搬入数など）を取得
 * @async
 * @returns {Promise<void>}
 * @throws {Error} 有効なデータが取得できない場合
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

    } catch (error) {
        console.error("❌ ダッシュボードデータ取得エラー:", error);
        
        // メインデータ取得失敗は重要なエラー
        NotificationManager.show(
            "ダッシュボードデータの取得に失敗しました。ネットワーク接続を確認してページを再読み込みしてください。",
            'error',
            0  // 手動で閉じるまで表示
        );
    } finally {
        AppState.isLoading = false;
    }
}

/**
 * レスポンシブデザイン対応：画面幅に応じたグラフフォントサイズを取得
 * PC（1200px超）、タブレット（768px超）、スマホ（768px以下）で異なるサイズを返す
 * @returns {Object} フォントサイズ設定オブジェクト
 * @returns {number} returns.titleFontSize - グラフタイトルのフォントサイズ
 * @returns {number} returns.axisTitleFontSize - 軸タイトルのフォントサイズ
 * @returns {number} returns.axisLabelFontSize - 軸ラベルのフォントサイズ
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
 * リサイズ時に全グラフを再描画する
 * AppStateに保存されたデータを使用して、グラフのみを再描画（数値データは更新しない）
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
        
        // 既存のChart.jsインスタンスをリサイズ
        const canvasIds = ['bedChart', 'ambulanceChart', 'inpatientsChart', 'dischargesChart', 'generalWardChart', 'icuChart', 'averageStayChart'];
        
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas && canvas.chartInstance) {
                // Chart.jsの内蔵リサイズ機能を呼び出す
                canvas.chartInstance.resize();
            }
        });
        
        // フォントサイズが変更されている可能性があるため完全再描画
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

/**
 * Chart.jsを使用して個別の折れ線グラフを作成する
 * レスポンシブフォントサイズ、既存グラフの破棄、インスタンス保存を実装
 * @param {string} canvasId - Canvas要素のID
 * @param {string} label - グラフのタイトル
 * @param {Array<string>} labels - X軸のラベル配列（日付）
 * @param {Array<number>} data - Y軸のデータ配列
 * @param {string} color - 線の色（CSSカラー名またはHEX）
 * @param {string} unit - Y軸の単位表示
 * @param {number|null} [maxY=null] - Y軸の最大値（設定しない場合は自動）
 * @returns {void}
 */
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
            onResize: (chart) => {
                // リサイズ時のカスタム処理
                chart.update();
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: label,
                    font: { size: titleFontSize }
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
            },
            // アニメーション設定でリサイズ時の滑らかさを向上
            animation: {
                duration: 0 // リサイズ時のアニメーションを無効化してレスポンス向上
            },
            transitions: {
                resize: {
                    animation: {
                        duration: 0
                    }
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


/**
 * 日付文字列を日本語形式にフォーマットする
 * @param {string|null} dateString - 日付文字列（ISO形式など）
 * @returns {string} 「YYYY年M月D日(曜日)」形式の文字列
 * @example
 * formatDate('2024-12-25') // '2024年12月25日(水)'
 */
function formatDate(dateString) {
    if (!dateString) return "日付不明";
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
}

/**
 * 日付文字列から時刻部分をHH:MM形式で抽出する
 * @param {string|null} dateString - 日付文字列（ISO形式など）
 * @returns {string} 「HH:MM」形式の時刻文字列
 * @example
 * formatTime('2024-12-25T14:30:00') // '14:30'
 */
function formatTime(dateString) {
    if (!dateString) return "--:--";
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * グラフのX軸用に日付を簡潔な形式にフォーマットする
 * @param {string} dateString - 日付文字列（ISO形式など）
 * @returns {string} 「M/D」形式の文字列
 * @example
 * formatDateForChart('2024-12-25') // '12/25'
 */
function formatDateForChart(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * イベントリスナー管理オブジェクト
 * クリック可能カード、リサイズイベントの設定と管理を担当
 * @namespace EventManager
 */
const EventManager = {
    /**
     * クリック可能なカードのイベントリスナーを設定
     * data-url属性を持つ.clickable-card要素にクリックとキーボードイベントを追加
     * @memberof EventManager
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
     * 外部リンクを新しいタブで安全に開く
     * noopener,noreferrerオプションでセキュリティ対策を実装
     * @memberof EventManager
     * @param {string} url - 開くURL（Google SheetsなURLなど）
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
     * ウィンドウリサイズイベントリスナーを設定
     * デバウンス処理で連続リサイズを抑制し、グラフ再描画を実行
     * @memberof EventManager
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
 * アプリケーションの初期化処理を実行する
 * イベントリスナー設定後、メインデータと特別データを並行取得する
 * @async
 * @returns {Promise<void>}
 * @throws {Error} 初期化に失敗した場合
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

/**
 * DOMの読み込み状態をチェックして初期化を実行
 * DOMContentLoadedイベントまたは即座実行でアプリケーションを開始
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}