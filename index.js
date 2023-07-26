const puppeteer = require('puppeteer');
const excel = require('exceljs');
const fs = require('fs');
//delay funtion to stop code exceution 
async function delay(milliseconds) {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            timeout: 0,
            defaultViewport: null,
        });

        const page = await browser.newPage({ timeout: 0 });

        await page.goto('https://news.google.com/home?hl=en-US&gl=US&ceid=US:en', {
            timeout: 0,
            waitUntil: 'networkidle2',
        });
        // Function to scrape and create XLS file
        const scrapeAndCreateXLSFile = async () => {
            const data = await getTextFromKfXsidElement(page);
            await createXLSFile(data);
        };
        
        // Expose the scrapeAndCreateXLSFile function to be used in the browser context
        await page.exposeFunction('scrapeAndCreateXLSFile', scrapeAndCreateXLSFile);
        
        // Add the event listener in the browser context
        await page.evaluate(() => {
            const inputField = document.querySelector('.Ax4B8.ZAGvjd');
            const handleInput = async () => {
                const value = inputField.value.trim();
                if (value === '') {
                    return; // If input value is empty, do nothing
                }
                await window.scrapeAndCreateXLSFile();
            };

            inputField.addEventListener('change', handleInput);
        });

        
        //   await browser.close();
    } catch (error) {
        console.error(error);
    }
}

async function getTextFromKfXsidElement(page) {
    while (true) {
        //classname .KfXsid // title 
        const kfXsidElements = await page.$$('.KfXsid');
        //classname .jNjBJf  // subtitle 
        const JNjBJfElements = await page.$$('.jNjBJf');
        // class .JAEwC  //image 
        const JAEwCElements = await page.$$('.JAEwC');
        if (kfXsidElements.length > 0) {
            const kfXsidTexts = [];
            for (let i = 0; i < kfXsidElements.length; i++) {
                const element = kfXsidElements[i];
                const element1 = JNjBJfElements[i];
                const element2 = JAEwCElements[i];
                const textContent = await page.evaluate(element => element.textContent, element);
                const textContent1 = await page.evaluate(element1 => element1?.textContent, element1);
                const textContent2 = await page.evaluate(element2 => element2?.src, element2);
                kfXsidTexts.push({ "Name(class=.KfXsid)": textContent, "Type(class=.jNjBJf)": textContent1, "Thumb(class.JAEwC)": textContent2 });
            }
            console.log(kfXsidTexts);
            return kfXsidTexts;
        }
        await page.waitForTimeout(1000); // Wait for 1 second before checking again
    }
}


//create xls file of scrapped data 

async function createXLSFile(data) {
    const fileName = 'output.xlsx';
    const workbook = new excel.Workbook();
    if (fs.existsSync(fileName)) {
        await workbook.xlsx.readFile(fileName);
        const existingWorksheet = workbook.getWorksheet('Data');
        data.forEach((item) => {
            const rowValues = Object.values(item).map((value) => {
                return value === undefined ? 'N/A' : value;
            });
            existingWorksheet.addRow(rowValues);
        });
    } else {
        const worksheet = workbook.addWorksheet('Data');
        worksheet.addRow(Object.keys(data[0]));
        data.forEach((item) => {
            const rowValues = Object.values(item).map((value) => {
                return value === undefined ? 'N/A' : value;
            });
            worksheet.addRow(rowValues);
        });
    }
    // Save the updated workbook back to the file
    await workbook.xlsx.writeFile(fileName);
    console.log(`Data ${data.length} rows appended to XLSX file "${fileName}" successfully.`);
}

main()  
