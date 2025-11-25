document.addEventListener('DOMContentLoaded', function() {
    const questionForm = document.getElementById('questionForm');
    const questionContentDiv = document.getElementById('questionContent');
    const imageDataInput = document.getElementById('imageData');
    const imageTypeInput = document.getElementById('imageType');
    const statusDiv = document.getElementById('status');
    const debugDiv = document.getElementById('debugInfo');

    // 1. 获取 Tableau URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const tableauUser = urlParams.get('userName') || 'Unknown User'; 
    const dashboardId = urlParams.get('dashboardName') || 'Unknown Dashboard';
    
    // 填充隱藏欄位和除錯資訊
    document.getElementById('tableauUser').value = tableauUser;
    document.getElementById('dashboardId').value = dashboardId;
    debugDiv.innerHTML = `已連結報表: ${dashboardId} | 使用者: ${tableauUser}`;

    // --- 2. 關鍵：圖片貼上和 Base64 轉換邏輯 ---

    // 儲存最終的 Base64 數據
    let finalBase64String = ''; 
    let finalImageType = '';   

    questionContentDiv.addEventListener('paste', function(e) {
        console.log('偵測到貼上事件。');
        
        // 每次貼上時，清除舊數據並準備好接收
        finalBase64String = ''; 
        finalImageType = '';
        imageDataInput.value = '';
        imageTypeInput.value = '';
        statusDiv.innerHTML = '正在處理貼上內容...';
        questionContentDiv.innerHTML = ''; // 立即清空，避免圖片與文字殘留

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let imageFound = false;

        for (const item of items) {
            // 檢查貼上內容是否是圖片
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault(); // 阻止瀏覽器預設行為
                imageFound = true;
                const file = item.getAsFile();
                
                if (!file) {
                    console.error('無法獲取圖片文件對象。');
                    statusDiv.innerHTML = '❌ 無法獲取圖片文件對象。';
                    break;
                }
                
                console.log(`偵測到圖片文件: ${file.type}, 大小: ${file.size}`);

                const reader = new FileReader();
                
                reader.onload = function(event) {
                    const base64DataURL = event.target.result;
                    const parts = base64DataURL.split(',');
                    
                    if (parts.length > 1) {
                        finalBase64String = parts[1];
                        finalImageType = file.type;
                        
                        // 核心：更新隱藏欄位
                        imageDataInput.value = finalBase64String;
                        imageTypeInput.value = finalImageType;
                        
                        console.log('✅ Base64 轉換成功。Input fields updated.');
                        
                        // 顯示佔位符
                        const imgPlaceholder = document.createElement('img');
                        imgPlaceholder.src = event.target.result;
                        imgPlaceholder.style.maxWidth = '100%';
                        imgPlaceholder.style.height = 'auto';
                        imgPlaceholder.title = '截圖已捕獲 (Base64)';
                        
                        // 將佔位符插入到已清空的 contenteditable 區域
                        questionContentDiv.appendChild(imgPlaceholder);
                        statusDiv.innerHTML = '✅ 截圖已捕獲！請繼續輸入問題。';
                    } else {
                        console.error('數據 URL 格式錯誤。');
                        statusDiv.innerHTML = '❌ 圖片數據提取失敗。';
                    }
                };
                
                reader.onerror = function() {
                    console.error('FileReader 讀取失敗。');
                    statusDiv.innerHTML = '❌ 圖片讀取失敗。';
                };
                
                // 讀取文件
                reader.readAsDataURL(file);
                break; // 只處理第一張圖片
            }
        }
        
        if (!imageFound) {
            // 如果沒有圖片，允許文本正常貼上
            statusDiv.innerHTML = 'ℹ️ 僅貼上了文字。';
        }
    });


    // --- 3. 表單提交邏輯 (發送到 Make) ---

    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // 提取純
