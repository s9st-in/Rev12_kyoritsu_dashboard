// Vue.jsアプリケーション用のスクリプト

const SpecialData = Vue.createApp({
    setup() {
        // 取得したデータを保管するための変数を作成します
        const fetchData = Vue.ref(null);

        // 元のAPIのデータ形式（HTML形式）を扱いやすいようにjson化します（暫定的対応）
        const suiyokaiStructedData = Vue.computed(() => {
            if (!fetchData.value || !fetchData.value.suiyokai) {
                return null;
            }

            try {
                // HTMLタグを除去して純粋なテキストを取得
                const textContent = fetchData.value.suiyokai
                    .replace(/<br\s*\/?>/gi, '\n')  // <br>を改行に変換
                    .replace(/<[^>]*>/g, '')        // その他のHTMLタグを除去
                    .trim();

                // 改行で分割
                const lines = textContent.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                if (lines.length === 0) {
                    return null;
                }

                // 最初の行はミッション、残りは説明
                const mission = lines[0];
                const descriptions = lines.slice(1)
                    .map(line => line.replace(/^・/, '').trim()); // 先頭の「・」を除去

                return {
                    mission: mission,
                    descriptions: descriptions,
                    originalHtml: fetchData.value.suiyokai
                };

            } catch (error) {
                console.error('水曜会データの構造化に失敗しました:', error);
                return {
                    error: 'データの構造化に失敗しました',
                    originalHtml: fetchData.value.suiyokai
                };
            }
        });

        const loadData = async () => {
            try {
                const result = await fetchApiData(API_CONFIG_URL['special-data']);
                console.log('取得したデータ:', result); // デバッグ用
                
                // データが正しく取得できた場合のみ設定
                if (result && result.specialData) {
                    fetchData.value = result.specialData;
                } else {
                    console.error('APIからのデータ形式が正しくありません:', result);
                    fetchData.value = { suiyokai: 'データ取得エラー' };
                }
            } catch (error) {
                console.error('データの取得に失敗しました:', error);
                fetchData.value = { suiyokai: 'データ取得失敗' };
            }
        }

        Vue.onMounted(() => {
            loadData();
        });

        return {
            fetchData,
            suiyokaiStructedData,
        };
    }
});

// DOMが読み込まれた後にVue.jsアプリケーションをマウント
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('special-data-container');
    if (container) {
        SpecialData.mount('#special-data-container');
    }
});
