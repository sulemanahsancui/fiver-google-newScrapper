const puppeteer = require('puppeteer');
const excel = require('exceljs');

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
        let timeoutId;
        // Expose the scrapeAndCreateXLSFile function to be used in the browser context
        await page.exposeFunction('scrapeAndCreateXLSFile', scrapeAndCreateXLSFile);
        // Add the event listener in the browser context
        await page.evaluate(() => {
            const inputField = document.querySelector('.Ax4B8.ZAGvjd');
            const handleInput = async () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(async () => {
                    await window.scrapeAndCreateXLSFile();
                }, 3000); // Adjust the delay as needed (e.g., 3000ms = 3 seconds)
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
            for (let i = 2; i < kfXsidElements.length - 1; i++) {
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

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Data');
    // Set the header row with the property names
    worksheet.addRow(Object.keys(data[0]));
    // Add the data to the worksheet
    data.forEach((item) => {
        const rowValues = Object.values(item).map((value) => {
            // Check if the value is null or empty, and replace it with "N/A"
            return value === undefined ? 'N/A' : value;
        });
        worksheet.addRow(rowValues);
    });
    // Generate a unique filename for the XLS file
    const fileName = `output_${Date.now()}.xlsx`;
    // Save the workbook to a file
    await workbook.xlsx.writeFile(fileName);
    console.log(`XLS file "${fileName}" created successfully.`);
}

main()  