# 植物日记 🌱

一款帮助你记录和管理植物养护的本地应用。支持植物档案、养护记录、智能提醒、数据导入导出等功能。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **路由**: React Router
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **测试**: Vitest + Testing Library

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 查看应用。

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 🛡️ 质量门禁

项目提供统一的验证命令，确保代码质量。**提交代码前必须执行**：

```bash
npm run verify
```

该命令会依次执行：
1. **类型检查** (`npm run typecheck`) - TypeScript 类型验证
2. **代码规范** (`npm run lint`) - ESLint 代码检查
3. **单元测试** (`npm run test`) - 核心业务逻辑测试

### 各阶段独立命令

| 命令 | 说明 |
|------|------|
| `npm run typecheck` | 仅运行 TypeScript 类型检查 |
| `npm run lint` | 仅运行 ESLint 代码检查 |
| `npm run test` | 运行所有单元测试（单次） |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |
| `npm run verify` | 完整质量门禁（推荐） |

## 🧪 测试体系

### 测试覆盖范围

核心业务逻辑单元测试覆盖：
- **日期与季节计算** - 养护周期计算、季节判断、下次养护日期预测
- **存储操作** - localStorage 读写、植物/记录 CRUD
- **导入导出** - JSON 格式验证、数据预览、合并策略
- **警告引擎** - 缺水、叶片发黄、生长停滞等健康预警
- **快照功能** - 数据版本管理与回滚
- **照片存储** - IndexedDB 照片增删查

### 测试工具

- **`src/test/setup.ts`** - 测试环境初始化，提供：
  - localStorage Mock
  - IndexedDB Mock（fake-indexeddb）
  - URL / Blob 等浏览器 API Mock
  - 自动清理测试数据

- **`src/test/testUtils.ts`** - 测试辅助工具：
  - 工厂函数快速创建测试数据
  - Mock 日期工具
  - 类型安全的测试数据构造器

### 编写新测试

测试文件命名：`*.test.ts` 或 `*.test.tsx`，放置在 `__tests__` 目录下。

示例：
```typescript
import { describe, it, expect } from 'vitest';
import { createMockPlant, setMockDate } from '../../test/testUtils';

describe('你的功能', () => {
  it('应该正常工作', () => {
    setMockDate('2025-06-15');
    const plant = createMockPlant({ name: '测试植物' });
    expect(plant.name).toBe('测试植物');
  });
});
```

## 💾 数据存储说明

所有数据**仅存储在浏览器本地**，不上传任何服务器。

### 存储位置

| 数据类型 | 存储方式 | Key / 库名 |
|----------|----------|------------|
| 植物档案、养护记录、跳过记录、快照 | localStorage | `plant_tracker_data` / `plant_tracker_snapshots` |
| 生长照片 | IndexedDB | `plant_tracker_photos` |

### 数据备份与恢复

应用内置导入导出功能：
- **导出**：将所有植物和记录数据导出为 JSON 文件（照片需单独备份）
- **导入**：支持预览导入数据，可选择覆盖或合并模式

**注意**：IndexedDB 中的照片不会随 JSON 导出，建议定期通过浏览器开发者工具备份。

### 数据结构

```typescript
interface AppData {
  plants: Plant[];           // 植物列表
  records: PlantRecord[];    // 养护记录
  careSkips?: CareSkip[];    // 跳过/延期记录
}
```

## 📁 目录结构

```
src/
├── components/       # React 组件
├── pages/           # 页面组件
├── store/           # Zustand 状态管理
├── utils/           # 工具函数 & 业务逻辑
│   ├── storage.ts   # 核心存储与业务逻辑
│   ├── warningEngine.ts  # 健康警告引擎
│   └── __tests__/  # 单元测试
├── test/            # 测试配置与工具
│   ├── setup.ts     # Vitest 环境初始化
│   └── testUtils.ts # 测试辅助函数
├── types/           # TypeScript 类型定义
├── lib/             # 通用工具
└── assets/          # 静态资源
```

## CI 集成

`npm run verify` 命令设计为可直接在 CI 环境中使用。示例 GitHub Actions 配置：

```yaml
- name: Install dependencies
  run: npm ci

- name: Run quality checks
  run: npm run verify
```
