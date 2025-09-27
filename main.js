// Duolingo自动刷经验脚本
// 配置部分
// prettier-ignore
const CONFIG = {
    timeout: 5000,      // 查找元素的超时时间(毫秒)
    username: "abwuge", // 用户名
    initialGoal: 0,     // 初始目标经验值(0表示自动从排行榜获取)
    logLevel: "info",   // 日志级别: "debug", "info", "warn", "error"
    optionDelay: 200    // 操作延时(毫秒)，防止操作过快
};

let goal = CONFIG.initialGoal;
let goalFromRank = false;
let gain = 0;

// 日志系统
const Logger = {
    debug: function (msg) {
        if (CONFIG.logLevel === "debug") {
            log("[DEBUG] " + msg);
        }
    },
    info: function (msg) {
        if (CONFIG.logLevel === "debug" || CONFIG.logLevel === "info") {
            log("[INFO] " + msg);
        }
    },
    warn: function (msg) {
        if (CONFIG.logLevel !== "error") {
            log("[WARN] " + msg);
        }
    },
    error: function (msg) {
        log("[ERROR] " + msg);
    },
    fatal: function (msg) {
        log("[FATAL] " + msg);
        throw new Error(msg);
    },
};

// 运行时统计
let startTime = new Date();

// 工具函数
function clickById(buttonId, timeout = CONFIG.timeout) {
    let button = id(buttonId).findOne(timeout);
    if (button) {
        button.click();
        sleep(CONFIG.optionDelay);
        return true;
    } else {
        Logger.error(`未找到按钮${buttonId}`);
        return false;
    }
}

function clickButton(button, buttonId = "") {
    if (button) {
        button.click();
        sleep(CONFIG.optionDelay);
        return true;
    } else {
        Logger.error(`未找到按钮${buttonId}`);
        return false;
    }
}

function waitForByText(text, timeout = CONFIG.timeout) {
    let element = textMatches(text).findOne(timeout);
    if (element) {
        Logger.debug(`检测到文本: "${element.text()}"`);
        return element;
    } else {
        Logger.warn(`等待文本"${text}"超时`);
        return null;
    }
}

function startApp() {
    app.launchApp("org.autojs.autojs6");
    app.startActivity({
        packageName: "org.autojs.autojs6",
        className: "org.autojs.autojs.ui.main.MainActivity",
    });
    sleep(CONFIG.optionDelay);
    app.launch("com.duolingo");
    app.startActivity({
        packageName: "com.duolingo",
        className: "com.duolingo.splash.LaunchActivity",
    });
    sleep(CONFIG.optionDelay);
}

function clickContinueButton(timeout = CONFIG.timeout) {
    let threadsArray = [];

    threadsArray.push(
        threads.start(function () {
            let button = id("continueButtonYellowStub")
                .findOne(timeout)
                .firstChild();
            threadsInterrupt(threadsArray, threads.currentThread());
            clickButton(button);
        })
    );

    threadsArray.push(
        threads.start(function () {
            let button = id("continueButtonRedStub")
                .findOne(timeout)
                .firstChild();
            threadsInterrupt(threadsArray, threads.currentThread());
            clickButton(button);
        })
    );

    threadsArray.forEach((thread) => thread.join(CONFIG.timeout));
}

// 功能函数
function checkAndEnableListenPractice() {
    Logger.info("检测是否启用听力练习");

    if (!clickById("listenReviewCard")) {
        Logger.warn("无法点击听力练习卡片");
        return false;
    }

    let completed = false;

    let threadsArray = [];

    threadsArray.push(
        threads.start(function () {
            let continueButton = id("coachContinueButton").findOne(
                CONFIG.timeout
            );
            if (continueButton && !completed) {
                threadsInterrupt(threadsArray, threads.currentThread());
                clickById("quitButton");
                Logger.info("听力练习已启用");
                completed = true;
            }
        })
    );

    threadsArray.push(
        threads.start(function () {
            let turnOnButton = id("practiceHubTurnOnButton").findOne(
                CONFIG.timeout
            );
            if (turnOnButton && !completed) {
                threadsInterrupt(threadsArray, threads.currentThread());
                turnOnButton.click();
                Logger.info("听力练习未启用，已启用");
                completed = true;
            }
        })
    );

    threadsArray.forEach((thread) => thread.join(CONFIG.timeout));

    if (!completed) {
        Logger.warn("检查听力练习状态超时");
    }

    return completed;
}

function enableListenPractice() {
    if (
        clickById("listenReviewCard") &&
        (clickById("practiceHubTurnOnButton") || clickById("quitButton"))
    ) {
        Logger.info("成功启用听力练习");
        return true;
    }
    Logger.warn("启用听力练习失败");
    return false;
}

function threadsInterrupt(threadsArray, currentThread) {
    threadsArray.forEach((thread) => {
        if (thread.id != currentThread.id) {
            thread.interrupt();
        }
    });
}

function enterPracticeHub() {
    Logger.info("进入练习基地");

    let threadsArray = [];

    // 方式1：练习基地位于溢出菜单
    threadsArray.push(
        threads.start(function () {
            clickById("overflowTab");
            threadsInterrupt(threadsArray, threads.currentThread());
            clickById("tabOverflowPracticeHubBackground");
        })
    );

    // 方式2：练习基地位于底部导航栏
    threadsArray.push(
        threads.start(function () {
            clickById("tabPracticeHub");
            threadsInterrupt(threadsArray, threads.currentThread());
        })
    );

    threadsArray.forEach((thread) => thread.join(CONFIG.timeout));
}

function returnToPracticeHub() {
    Logger.info("返回练习基地");

    for (let i = 0; i < 10; ++i) {
        let threadsArray = [];

        let clickedBack = false;
        threadsArray.push(
            threads.start(function () {
                clickById("primaryButton");
                threadsInterrupt(threadsArray, threads.currentThread());
            })
        );

        threadsArray.push(
            threads.start(function () {
                clickById("nonSessionEndContinueButton");
                threadsInterrupt(threadsArray, threads.currentThread());
            })
        );

        threadsArray.push(
            threads.start(function () {
                clickById("back");
                threadsInterrupt(threadsArray, threads.currentThread());
                clickedBack = true;
            })
        );

        threadsArray.forEach((thread) => thread.join(CONFIG.timeout));

        if (clickedBack) break;
    }

    if (!waitForByText("今天的复习内容")) {
        Logger.warn("返回练习基地超时，通过重启应用返回");
        startApp();

        enterPracticeHub();

        if (!waitForByText("今天的复习内容")) {
            Logger.fatal("程序无法返回练习基地！");
        } else Logger.info("已返回练习基地");
    }

    return true;
}

function clickStartButton() {
    // 在mistakesCollection中寻找，避免点击到todayReviewCard中的startButton
    let mistakesCollection = id("mistakesCollection").findOne(CONFIG.timeout);
    let startButton = null;
    if (mistakesCollection) {
        startButton = mistakesCollection.findOne(id("startButton"));
    }
    if (!startButton) {
        Logger.error("未找到开始按钮");
        return 0;
    }

    let expValue = parseInt(startButton.text().match(/开始 \+(\d+) 经验/)[1]);
    startButton.click();

    goal -= expValue;

    let message = `已获得 ${gain} (+${expValue}) 经验，还差 ${goal} 经验`;
    toast(message);
    Logger.info(message);

    gain += expValue;

    return expValue;
}

function clickDisableListenButton(isFirst = true) {
    if (!clickById("disableListenButton")) {
        if (!isFirst) Logger.fatal("无法找到禁用听力按钮");

        Logger.error("无法找到禁用听力按钮，回到练习基地");
        returnToPracticeHub();

        enableListenPractice();

        clickById("mistakesPracticeCard");
        waitForByText(".*道错题");

        clickStartButton();

        clickById("coachContinueButton");
        clickDisableListenButton(false);
    }
}

function checkAndStartMistakesPractice() {
    Logger.info("开始错题本练习");

    let result = false;
    if (!clickById("mistakesPracticeCard")) {
        Logger.error("无法进入错题本页面");
        return result;
    }

    if (!waitForByText(".*道错题")) {
        Logger.error("无法确认是否进入错题本页面");
        return result;
    }

    let completed = false;

    let threadsArray = [];

    threadsArray.push(
        threads.start(function () {
            let mistakesAllDone = id("mistakesTitle")
                .textContains("所有错题都重练过了！")
                .findOne(CONFIG.timeout);
            if (mistakesAllDone && !completed) {
                completed = true;
                result = false;
                threadsInterrupt(threadsArray, threads.currentThread());
                Logger.info("所有错题都重练过了，无法通过错题本获取经验！");
            }
        })
    );

    threadsArray.push(
        threads.start(function () {
            // 在mistakesCollection中寻找，避免点击到todayReviewCard中的startButton
            let mistakesCollection = id("mistakesCollection").findOne(
                CONFIG.timeout
            );
            let startButton = null;
            if (mistakesCollection) {
                startButton = mistakesCollection.findOne(id("startButton"));
            }

            if (startButton && !completed) {
                completed = true;
                result = true;
                threadsInterrupt(threadsArray, threads.currentThread());
                Logger.info("开始错题练习");

                clickStartButton();

                clickById("coachContinueButton");
                clickDisableListenButton();
                clickContinueButton();
                clickById("continueButtonView");
                returnToPracticeHub();
            }
        })
    );

    threadsArray.forEach((thread) => thread.join(CONFIG.timeout));

    if (!completed) {
        Logger.warn("检查错题本状态超时");
    }

    while (result && goal > 0) mistakesPractice();

    return result;
}

function mistakesPractice() {
    enableListenPractice();

    clickById("mistakesPracticeCard");
    waitForByText(".*道错题");

    clickStartButton();

    clickById("coachContinueButton");
    clickDisableListenButton();
    clickContinueButton();
    clickById("continueButtonView");
    returnToPracticeHub();

    return true;
}

function setGoal() {
    Logger.info("设置目标经验值");

    if (!clickById("tabLeagues")) {
        Logger.error("无法切换到排行榜页面");
        goal = 1000;
        return false;
    }

    try {
        // 尝试查找用户的经验值
        let userScoreText = id("usernameView")
            .text(CONFIG.username)
            .findOne(CONFIG.timeout);
        if (!userScoreText) {
            throw new Error("未找到用户信息");
        }
        userScoreText = userScoreText
            .parent()
            .parent()
            .parent()
            .findOne(id("xpView"))
            .text();

        // 尝试查找第一名的经验值
        let rankFirstScoreText = null;
        for (let i = 0; i < 10; i++) {
            swipe(
                device.width / 2,
                device.height * 0.4,
                device.width / 2,
                device.height * 0.8,
                CONFIG.optionDelay
            );
            sleep(CONFIG.optionDelay);
            rankFirstScoreText = id("rankView").text("1").findOne(1000);
            if (rankFirstScoreText) {
                break;
            }
        }
        if (!rankFirstScoreText) {
            throw new Error("未找到第一名信息");
        }
        rankFirstScoreText = rankFirstScoreText
            .parent()
            .findOne(id("xpView"))
            .text();

        // 解析经验值
        let userScore = parseInt(userScoreText.match(/(\d+) 经验/)[1]);
        let rankFirstScore = parseInt(
            rankFirstScoreText.match(/(\d+) 经验/)[1]
        );

        // 计算目标
        goal = rankFirstScore - userScore;

        Logger.info(`第一名的经验值: ${rankFirstScore}`);
        Logger.info(`你的经验值: ${userScore}`);
        Logger.info(`目标经验: ${goal}`);

        if (goal <= 0) {
            goalFromRank = false;
            Logger.info("你已经领先了！设置100经验作为目标");
            goal = 100;
        }
    } catch (e) {
        Logger.error(`获取经验值失败: ${e}`);
        goal = 1000;
        Logger.info("设置默认目标经验值: 1000");
    }

    enterPracticeHub();

    return true;
}

function muteDevice() {
    // 保存和设置音量
    let initialMusicVolume = device.getMusicVolume();
    device.setMusicVolume(0);
    Logger.info("设备已静音");

    // 设置退出处理
    events.on("exit", function () {
        console.hide();
        device.setMusicVolume(initialMusicVolume);
        Logger.info(`设备音量已恢复到 ${initialMusicVolume}`);
    });
}

function main() {
    goalFromRank = CONFIG.initialGoal <= 0;

    muteDevice();

    // 启动应用
    startApp();
    Logger.info("已启动Duolingo应用");

    // 设置目标
    if (goal <= 0) {
        setGoal();
    } else {
        enterPracticeHub();
    }

    // 主循环
    // let loopCount = 0;
    let maxLoops = 10; // 防止无限循环

    for (let loopCount = 1; goal > 0 && loopCount < maxLoops; ++loopCount) {
        Logger.info(`循环 ${loopCount}/${maxLoops}, 剩余目标: ${goal}`);

        // 检查并启用听力练习
        checkAndEnableListenPractice();

        // 开始错题练习
        checkAndStartMistakesPractice();

        // 检查目标是否达成
        if (goal <= 0) {
            if (goalFromRank) {
                Logger.info("再次检查目标经验");
                setGoal();

                if (goal > 0) {
                    Logger.info(`目标经验值已更新: ${goal}，继续练习`);
                    toast(`目标经验值已更新: ${goal}，继续练习`);
                    continue;
                }
            }

            let message = "已达成目标经验值，退出程序";
            Logger.info(message);
            toast(message);
            break;
        }
    }

    if (loopCount == maxLoops) {
        Logger.warn(`达到最大循环次数 ${maxLoops}，自动退出`);
    }
    // 最终统计
    let endTime = new Date();
    let runTime = (endTime - startTime) / 1000 / 60; // 转换为分钟

    Logger.info("====== 运行统计 ======");
    Logger.info(`运行时间: ${runTime.toFixed(2)}分钟`);
    Logger.info(`完成循环: ${loopCount} 次`);
    Logger.info(`成功获取经验: ${gain} 经验`);
    if (goal <= 0) {
        Logger.info("状态: 成功达成目标经验值");
    } else {
        Logger.info(`状态: 未完成目标，还差 ${goal} 经验值`);
    }
}

// 执行主函数
main();
