/**
 * 数据库服务使用示例
 *
 * 此文件展示如何使用 DatabaseService
 * 实际使用时请根据需要导入并调用
 */

import { databaseService } from './databaseService'

/**
 * 示例：初始化数据库连接
 */
async function exampleInitialize(): Promise<void> {
  try {
    // 方式1: 使用配置管理器的配置
    await databaseService.initialize()
    console.log('数据库初始化成功（使用系统配置）')

    // 方式2: 使用自定义配置
    // const customConfig = configManager.getConfig()
    // await databaseService.initialize(customConfig)
  } catch (error) {
    console.error('数据库初始化失败:', error)
  }
}

/**
 * 示例：插入单条数据
 */
async function exampleInsert(): Promise<void> {
  try {
    const result = await databaseService.insert('live_rooms', {
      room_id: '123456',
      room_name: '测试直播间',
      user_id: '789',
      status: 1,
      created_at: Date.now()
    })

    console.log('插入成功, ID:', result.insertId)
    console.log('影响行数:', result.affectedRows)
  } catch (error) {
    console.error('插入失败:', error)
  }
}

/**
 * 示例：批量插入数据
 */
async function exampleInsertBatch(): Promise<void> {
  try {
    const dataList = [
      {
        room_id: '111',
        room_name: '直播间1',
        user_id: '001',
        status: 1,
        created_at: Date.now()
      },
      {
        room_id: '222',
        room_name: '直播间2',
        user_id: '002',
        status: 1,
        created_at: Date.now()
      },
      {
        room_id: '333',
        room_name: '直播间3',
        user_id: '003',
        status: 0,
        created_at: Date.now()
      }
    ]

    const result = await databaseService.insertBatch('live_rooms', dataList)
    console.log('批量插入成功，影响行数:', result.affectedRows)
  } catch (error) {
    console.error('批量插入失败:', error)
  }
}

/**
 * 示例：查询数据
 */
async function exampleSelect(): Promise<void> {
  try {
    // 查询所有数据
    const allRooms = await databaseService.select('live_rooms')
    console.log('所有直播间:', allRooms)

    // 条件查询
    const activeRooms = await databaseService.select('live_rooms', { status: 1 })
    console.log('活跃直播间:', activeRooms)

    // 指定字段查询
    const roomIds = await databaseService.select('live_rooms', { status: 1 }, [
      'room_id',
      'room_name'
    ])
    console.log('直播间ID和名称:', roomIds)
  } catch (error) {
    console.error('查询失败:', error)
  }
}

/**
 * 示例：更新数据
 */
async function exampleUpdate(): Promise<void> {
  try {
    const result = await databaseService.update(
      'live_rooms',
      { status: 0, updated_at: Date.now() }, // 更新的数据
      { room_id: '123456' } // WHERE 条件
    )

    console.log('更新成功，影响行数:', result.affectedRows)
  } catch (error) {
    console.error('更新失败:', error)
  }
}

/**
 * 示例：删除数据
 */
async function exampleDelete(): Promise<void> {
  try {
    const result = await databaseService.delete('live_rooms', { room_id: '123456' })
    console.log('删除成功，影响行数:', result.affectedRows)
  } catch (error) {
    console.error('删除失败:', error)
  }
}

/**
 * 示例：执行自定义SQL查询
 */
async function exampleCustomQuery(): Promise<void> {
  try {
    // 查询统计数据
    const stats = await databaseService.query<Array<{ total: number; active: number }>>(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active FROM live_rooms'
    )
    console.log('统计数据:', stats)

    // 带参数的查询
    const rooms = await databaseService.query(
      'SELECT * FROM live_rooms WHERE user_id = ? AND status = ?',
      ['001', 1]
    )
    console.log('查询结果:', rooms)
  } catch (error) {
    console.error('查询失败:', error)
  }
}

/**
 * 示例：使用事务
 */
async function exampleTransaction(): Promise<void> {
  try {
    const result = await databaseService.transaction(async (connection) => {
      // 在事务中执行多个操作
      await connection.execute(
        'INSERT INTO live_rooms (room_id, room_name, user_id, status) VALUES (?, ?, ?, ?)',
        ['444', '事务测试房间', '004', 1]
      )

      await connection.execute('UPDATE live_rooms SET status = 0 WHERE room_id = ?', ['333'])

      // 返回事务结果
      return { success: true, message: '事务执行成功' }
    })

    console.log('事务结果:', result)
  } catch (error) {
    console.error('事务执行失败（已自动回滚）:', error)
  }
}

/**
 * 示例：检查连接状态
 */
async function exampleCheckConnection(): Promise<void> {
  const isConnected = await databaseService.isConnected()
  console.log('数据库连接状态:', isConnected ? '已连接' : '未连接')

  if (isConnected) {
    const config = databaseService.getCurrentConfig()
    console.log('当前配置:', config)
  }
}

/**
 * 示例：完整使用流程
 */
async function exampleFullWorkflow(): Promise<void> {
  try {
    // 1. 初始化连接
    await databaseService.initialize()
    console.log('✓ 数据库连接成功')

    // 2. 检查连接状态
    const isConnected = await databaseService.isConnected()
    if (!isConnected) {
      throw new Error('数据库未连接')
    }

    // 3. 插入数据
    await databaseService.insert('live_rooms', {
      room_id: 'test_001',
      room_name: '测试房间',
      user_id: 'user_001',
      status: 1,
      created_at: Date.now()
    })
    console.log('✓ 数据插入成功')

    // 4. 查询数据
    const rooms = await databaseService.select('live_rooms', { room_id: 'test_001' })
    console.log('✓ 查询成功:', rooms)

    // 5. 更新数据
    await databaseService.update('live_rooms', { status: 0 }, { room_id: 'test_001' })
    console.log('✓ 数据更新成功')

    // 6. 删除数据
    await databaseService.delete('live_rooms', { room_id: 'test_001' })
    console.log('✓ 数据删除成功')
  } catch (error) {
    console.error('❌ 操作失败:', error)
  } finally {
    // 7. 关闭连接
    await databaseService.close()
    console.log('✓ 数据库连接已关闭')
  }
}

// 导出示例函数供参考
export {
  exampleInitialize,
  exampleInsert,
  exampleInsertBatch,
  exampleSelect,
  exampleUpdate,
  exampleDelete,
  exampleCustomQuery,
  exampleTransaction,
  exampleCheckConnection,
  exampleFullWorkflow
}
