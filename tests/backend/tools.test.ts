import { existsSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Tool, ToolFormValues } from 'types';
import { getTools, getToolsDirectory } from '@backend/db/api';
import { handleAddTool, handleDeleteTool, handleEditTool, openToolExecutable, updateToolsFolder } from '@backend/tools';
import { makeTool } from '../helpers/fixtures';
import { openTestStore } from '../helpers/store';
import { makeTempDir, writeTree } from '../helpers/tempDir';

let toolsDir: string;
let sourceDir: string;

beforeEach(() => {
  toolsDir = makeTempDir('emm-tools-');
  sourceDir = makeTempDir('emm-source-');
});

const openStoreWith = (tools: Tool[] = []) => openTestStore({ toolFolderPath: toolsDir, tools });

const toolForm = (overrides: Partial<ToolFormValues> = {}): ToolFormValues => ({
  name: 'Param Editor',
  version: '1.0',
  path: join(sourceDir, 'ParamEditor.exe'),
  copy: false,
  deleteSource: false,
  ...overrides,
});

describe('handleAddTool', () => {
  it('registers the executable where it is when not copying', () => {
    writeTree(sourceDir, { 'ParamEditor.exe': '' });
    openStoreWith();

    const id = handleAddTool(toolForm(), 'linked-mod');

    expect(getTools()).toEqual([
      expect.objectContaining({
        id,
        name: 'Param Editor',
        version: '1.0',
        modUuid: 'linked-mod',
        executablePath: join(sourceDir, 'ParamEditor.exe'),
      }),
    ]);
  });

  it('copies just the executable into the tools folder', () => {
    writeTree(sourceDir, { 'ParamEditor.exe': 'exe', 'other.txt': '' });
    openStoreWith();

    handleAddTool(toolForm({ copy: true }));

    const copied = join(toolsDir, 'param-editor-1.0', 'ParamEditor.exe');
    expect(getTools()[0].executablePath).toBe(copied);
    expect(existsSync(copied)).toBe(true);
    expect(existsSync(join(toolsDir, 'param-editor-1.0', 'other.txt'))).toBe(false);
    expect(existsSync(join(sourceDir, 'ParamEditor.exe'))).toBe(true);
  });

  it('copies the whole folder when asked', () => {
    writeTree(sourceDir, { 'ParamEditor.exe': '', 'Assets/data.bin': '' });
    openStoreWith();

    handleAddTool(toolForm({ copy: true, copyEntireFolder: true }));

    expect(existsSync(join(toolsDir, 'param-editor-1.0', 'Assets', 'data.bin'))).toBe(true);
  });

  it('deletes the source after copying when asked', () => {
    writeTree(sourceDir, { 'ParamEditor.exe': '', 'other.txt': '' });
    openStoreWith();

    handleAddTool(toolForm({ copy: true, deleteSource: true }));

    expect(existsSync(join(sourceDir, 'ParamEditor.exe'))).toBe(false);
    expect(existsSync(join(sourceDir, 'other.txt'))).toBe(true);
  });

  it.each([
    ['without a name', { name: '' }],
    ['without a path', { path: '' }],
    ['when the executable does not exist', { path: '/nowhere/missing.exe' }],
  ])('fails %s', (_label, overrides) => {
    openStoreWith();

    expect(handleAddTool(toolForm(overrides))).toBe(false);
    expect(getTools()).toEqual([]);
  });

  it('fails rather than overwrite an existing copied tool folder', () => {
    writeTree(sourceDir, { 'ParamEditor.exe': '' });
    writeTree(toolsDir, { 'param-editor-1.0/ParamEditor.exe': '' });
    openStoreWith();

    expect(handleAddTool(toolForm({ copy: true }))).toBe(false);
    expect(getTools()).toEqual([]);
  });
});

describe('handleDeleteTool', () => {
  it('removes the tool', () => {
    openStoreWith([
      makeTool({ id: 't1', name: 'A', executablePath: '/x/a.exe' }),
      makeTool({ id: 't2', name: 'B', executablePath: '/x/b.exe' }),
    ]);

    handleDeleteTool('t1');

    expect(getTools().map((tool) => tool.id)).toEqual(['t2']);
  });

  it("refuses to delete a mod's tool unless forced", () => {
    openStoreWith([makeTool({ id: 't1', name: 'A', modUuid: 'mod', executablePath: '/x/a.exe' })]);

    expect(() => handleDeleteTool('t1')).toThrow(/associated with a mod/);
    expect(getTools()).toHaveLength(1);

    handleDeleteTool('t1', true);
    expect(getTools()).toEqual([]);
  });

  it('deletes the whole copied folder of a managed tool when deleting files', () => {
    writeTree(toolsDir, { 'param-editor/ParamEditor.exe': '', 'param-editor/Assets/data.bin': '' });
    openStoreWith([
      makeTool({ id: 't1', name: 'A', executablePath: join(toolsDir, 'param-editor', 'ParamEditor.exe') }),
    ]);

    handleDeleteTool('t1', false, true);

    expect(existsSync(join(toolsDir, 'param-editor'))).toBe(false);
    expect(existsSync(toolsDir)).toBe(true);
  });

  it('deletes only the executable of a tool outside the tools folder', () => {
    writeTree(sourceDir, { 'ParamEditor.exe': '', 'other.txt': '' });
    openStoreWith([makeTool({ id: 't1', name: 'A', executablePath: join(sourceDir, 'ParamEditor.exe') })]);

    handleDeleteTool('t1', false, true);

    expect(existsSync(join(sourceDir, 'ParamEditor.exe'))).toBe(false);
    expect(existsSync(join(sourceDir, 'other.txt'))).toBe(true);
  });

  it('leaves files on disk by default', () => {
    writeTree(toolsDir, { 'param-editor/ParamEditor.exe': '' });
    openStoreWith([
      makeTool({ id: 't1', name: 'A', executablePath: join(toolsDir, 'param-editor', 'ParamEditor.exe') }),
    ]);

    handleDeleteTool('t1');

    expect(existsSync(join(toolsDir, 'param-editor', 'ParamEditor.exe'))).toBe(true);
  });

  it('rejects an unknown tool', () => {
    openStoreWith();
    expect(() => handleDeleteTool('missing')).toThrow(/not found/);
  });
});

describe('handleEditTool', () => {
  it('updates only the given fields', () => {
    openStoreWith([makeTool({ id: 't1', name: 'A', version: '1.0', executablePath: '/x/a.exe' })]);

    handleEditTool('t1', { name: 'Renamed' });

    expect(getTools()[0]).toMatchObject({ name: 'Renamed', version: '1.0', executablePath: '/x/a.exe' });
  });

  it('rejects an unknown tool', () => {
    openStoreWith();
    expect(() => handleEditTool('missing', { name: 'x' })).toThrow(/not found/);
  });
});

describe('updateToolsFolder', () => {
  it('moves managed tools and updates their paths, leaving tools outside the folder alone', () => {
    writeTree(toolsDir, { 'param-editor/ParamEditor.exe': '' });
    const external = join(sourceDir, 'External.exe');
    openStoreWith([
      makeTool({ id: 'managed', name: 'A', executablePath: join(toolsDir, 'param-editor', 'ParamEditor.exe') }),
      makeTool({ id: 'external', name: 'B', executablePath: external }),
    ]);
    const newDir = join(makeTempDir('emm-new-tools-'), 'tools');

    updateToolsFolder(newDir);

    expect(existsSync(join(newDir, 'param-editor', 'ParamEditor.exe'))).toBe(true);
    expect(getTools().map((tool) => tool.executablePath)).toEqual([
      join(newDir, 'param-editor', 'ParamEditor.exe'),
      external,
    ]);
    expect(getToolsDirectory()).toBe(newDir);
  });

  it('leaves everything alone when the new folder is not empty', () => {
    writeTree(toolsDir, { 'param-editor/ParamEditor.exe': '' });
    const newDir = writeTree(makeTempDir('emm-new-tools-'), { 'something.txt': '' });
    openStoreWith();

    updateToolsFolder(newDir);

    expect(existsSync(join(toolsDir, 'param-editor', 'ParamEditor.exe'))).toBe(true);
    expect(getToolsDirectory()).toBe(toolsDir);
  });
});

describe('openToolExecutable', () => {
  it('rejects an unknown tool', async () => {
    openStoreWith();
    await expect(openToolExecutable('missing')).rejects.toThrow(/not found/);
  });

  it('rejects a tool whose executable is gone', async () => {
    openStoreWith([makeTool({ id: 't1', name: 'A', executablePath: join(sourceDir, 'gone.exe') })]);
    await expect(openToolExecutable('t1')).rejects.toThrow(/does not exist/);
  });
});
