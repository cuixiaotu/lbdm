/* eslint-disable @typescript-eslint/explicit-function-return-type */

// 等待DOM元素出现的辅助函数
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // 先检查元素是否已存在
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector)
      if (element) {
        obs.disconnect()
        resolve(element)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // 设置超时
    setTimeout(() => {
      observer.disconnect()
      reject(new Error('等待元素超时: ' + selector))
    }, timeout)
  })
}

function waitForElements(selector, includes = undefined, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // 先检查元素是否已存在
    const elements = document.querySelectorAll(selector)
    const content = Array.from(elements)
      .map((ele) => ele.textContent.trim())
      .join(';')
    if (elements.length > 0) {
      if (includes !== undefined && content.includes(includes)) {
        console.info('[waitForElements] 发现元素1')
        resolve(elements)
      } else {
        console.info('[waitForElements] 发现元素2')
        resolve(elements)
      }
      return
    }

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations, obs) => {
      const elements = document.querySelectorAll(selector)
      const content = Array.from(elements)
        .map((ele) => ele.textContent.trim())
        .join(';')
      if (elements.length > 0) {
        if (includes !== undefined && content.includes(includes)) {
          console.info('[waitForElements] 发现元素3')
          obs.disconnect()
          resolve(elements)
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // 设置超时
    setTimeout(() => {
      observer.disconnect()
      reject(new Error('等待元素超时: ' + selector))
    }, timeout)
  })
}

// 等待并填充表单
;(async () => {
  try {
    const href = window.location.href

    if (href.includes('login')) {
      console.log('开始等待表单元素...')

      // 等待用户名输入框出现
      const usernameInput = await waitForElement('input[name="email"]')
      console.log('找到用户名输入框')

      // 等待密码输入框出现
      const passwordInput = await waitForElement('input[type="password"]')
      console.log('找到密码输入框')

      // 填充用户名 (使用 ${options.username} 占位符)
      usernameInput.value = '${options.username}'
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }))
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }))

      // 填充密码 (使用 ${options.password} 占位符)
      passwordInput.value = '${options.password}'
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }))

      console.log('已自动填充用户名和密码')

      // 等待协议复选框出现
      const agreementCheckDiv = await waitForElement('.account-center-agreement-check')
      console.log('找到协议复选框')

      // 检查是否已勾选
      if (!agreementCheckDiv.classList.contains('checked')) {
        console.log('协议未勾选，自动点击勾选')
        agreementCheckDiv.click()
        // 等待一小段时间确保状态更新
        await new Promise((resolve) => setTimeout(resolve, 300))
      } else {
        console.log('协议已勾选，跳过')
      }

      // 等待提交按钮出现
      const submitButton = await waitForElement('.account-center-submit button')
      console.log('找到提交按钮')

      // 检查提交按钮内的 button 标签是否有验证错误
      const innerButton = submitButton.querySelector('button')
      if (innerButton && innerButton.classList.contains('form-validate-error')) {
        console.log('表单验证失败，存在 form-validate-error，跳过提交')
      } else {
        // 点击提交按钮
        submitButton.click()
        console.log('已自动点击提交按钮')
      }
    }
    const liveNav = await waitForElement('div[x-navigator-header-item="operate"]')
    if (liveNav && liveNav.textContent.trim() === '直播') {
      liveNav.click()
    } else {
      console.error('点击直播导航失败')
      return
    }
    const organizations = await waitForElements(
      '#group-select-container div',
      '${options.organizationId}'
    )
    console.log('找到组织下拉框: ', organizations.length)
    console.table(Array.from(organizations).map((org) => org.textContent.trim()))
    const wrappers = Array.from(organizations).filter((div) =>
      div.className.includes('new_group-options-list-item-wrapper')
    )
    if (wrappers.length == 0) {
      console.error('wrapper未发现')
      return
    }
    console.table(wrappers.map((org) => org.textContent.trim()))
    const targetOrganization = wrappers.filter((div) =>
      div.textContent.trim().includes('${options.organizationId}')
    )
    if (targetOrganization.length === 0) {
      console.error('未找到组织-${options.organizationId}')
      console.table()
      return
    }
    targetOrganization[0].click()
  } catch (error) {
    console.error('自动化操作执行失败:', error.message)
  }
})()
