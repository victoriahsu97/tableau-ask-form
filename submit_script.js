document.addEventListener('DOMContentLoaded', function() {
    // --- 1. 初始化 Tableau Extension API ---
    // 必須先初始化 API 才能操作 Tableau 參數
    tableau.extensions.initializeAsync().then(function() {
        // 獲取當前工作簿物件 (假設您的參數是工作簿級別)
        const workbook = tableau.extensions.dashboardContent.dashboard.worksheets[0].parentWorkbook;
        
        // 🚨 關鍵參數名稱：您必須在 Tableau Desktop 中創建這個參數！
        const INPUT_PAYLOAD_PARAM = 'TabPy_Input_Payload';
        
        // --- 2. 變數宣告區塊 ---
        const questionForm = document.getElementById('questionForm');
        const questionContentDiv = document.getElementById('questionContent');
        const imageDataInput = document.getElementById('imageData');
        const imageTypeInput = document.getElementById('imageType');
        const statusDiv = document.getElementById('status');
        const debugDiv = document.getElementById('debugInfo');
        const screenshotHelperButton = document.getElementById('screenshotHelperButton');
        
        // 獲取 Tableau URL 參數
        const urlParams = new URLSearchParams(window.location.search);
        const tableauUser = urlParams.get('userName') || 'Unknown User';  
        const dashboardId = urlParams.get('dashboardName') || 'Unknown Dashboard'; // 作為 catype
        
        // 填充隱藏欄位和除錯資訊
        document.getElementById('tableauUser').value = tableauUser;
        document.getElementById('dashboardId').value = dashboardId;
        debugDiv.innerHTML = `已連結報表: ${dashboardId} | 使用者: ${tableauUser}`;
        
        // --- 截圖輔助按鈕事件 ---
        if (screenshotHelperButton) {
            screenshotHelperButton.addEventListener('click', function() {
                alert("請使用系統快捷鍵截取 Tableau 畫面並貼回提問框。\n\nWindows: Win + Shift + S\nMac: Command + Shift + 4");
                questionContentDiv.focus();
            });
        }

        // --- 3. 圖片貼上和 Base64 轉換邏輯 (不變) ---
        let finalBase64String = '';
        let finalImageType = '';
        
        questionContentDiv.addEventListener('paste', function(e) {
            console.log('偵測到貼上事件。');
            
            finalBase64String = '';  
            finalImageType = '';
            imageDataInput.value = '';
            imageTypeInput.value = '';
            statusDiv.innerHTML = '正在處理貼上內容...';
            
            const currentText = questionContentDiv.innerText.trim();
            questionContentDiv.innerHTML = '';  
            
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            let imageFound = false;

            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault(); 
                    imageFound = true;
                    const file = item.getAsFile();
                    
                    const MAX_SIZE_BYTES = 4000000;  
                    if (file.size > MAX_SIZE_BYTES) {
                        statusDiv.innerHTML = '❌ 截圖檔案過大 (超過 4MB)，請截取較小範圍。';
                        return;
                    }
                    
                    const reader = new FileReader();
                    
                    reader.onload = function(event) {
                        const base64DataURL = event.target.result;
                        const parts = base64DataURL.split(',');
                        
                        if (parts.length > 1) {
                            finalBase64String = parts[1];  
                            finalImageType = file.type;
                            
                            // 更新隱藏欄位
                            imageDataInput.value = finalBase64String;
                            imageTypeInput.value = finalImageType;
                            
                            // 顯示圖片佔位符
                            const imgPlaceholder = document.createElement('img');
                            imgPlaceholder.src = event.target.result;
                            imgPlaceholder.style.maxWidth = '100%';
                            imgPlaceholder.style.height = 'auto';
                            
                            questionContentDiv.innerHTML = (currentText ? currentText + '<br>' : '');  
                            questionContentDiv.appendChild(imgPlaceholder);
                            questionContentDiv.appendChild(document.createElement('br'));
                            
                            statusDiv.innerHTML = '✅ 截圖已捕獲！請繼續輸入問題。';
                        } else {
                            statusDiv.innerHTML = '❌ 圖片數據提取失敗。';
                        }
                    };
                    
                    reader.readAsDataURL(file);
                    break;
                }
            }
            
            if (!imageFound) {
                questionContentDiv.innerHTML = currentText;  
                statusDiv.innerHTML = 'ℹ️ 僅貼上了文字。';
            }
        });

        // --- 4. 關鍵修正：表單提交邏輯 (寫入參數) ---
        questionForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // 提取純文本問題內容
            const questionText = questionContentDiv.innerText.trim();
            const imageData = imageDataInput.value;
            
            // 檢查必須有文本或圖片數據
            if (!questionText && !imageData) {
                statusDiv.innerHTML = '請輸入提問內容或貼上截圖！';
                return;
            }

            statusDiv.innerHTML = '正在發送數據到 Tableau 參數...';

            // 構造發送到 TabPy 的 Payload (JSON 字串)
            const tabPyPayload = JSON.stringify({
                TsBody: questionText,
                empId: tableauUser,
                catype: dashboardId,
                image_data_base64: imageDataInput.value,
                image_mime_type: imageTypeInput.value || 'image/png'
            });

            // 🚨 呼叫 Tableau API，將 Payload 寫入參數中
            workbook.changeParameterValueAsync(INPUT_PAYLOAD_PARAM, tabPyPayload)
                .then(function() {
                    statusDiv.innerHTML = '✅ 數據已成功傳送給 TabPy。正在等待 AI 回覆...';
                    
                    // 提交成功後清除表單
                    questionForm.reset();
                    questionContentDiv.innerHTML = '';
                    imageDataInput.value = '';
                    imageTypeInput.value = '';
                })
                .catch(function(error) {
                    console.error('寫入 Tableau 參數失敗:', error);
                    statusDiv.innerHTML = '❌ 傳送失敗，請確保 Tableau 參數名稱正確且 TabPy 服務已連線。';
                });
        });
    }); // 結束 tableau.extensions.initializeAsync()
}); // 結束 DOMContentLoaded
