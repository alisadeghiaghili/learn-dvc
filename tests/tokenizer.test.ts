import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/engine/tokenizer';

describe('tokenize', () => {
  it('splits simple whitespace separated words', () => {
    expect(tokenize('git add data.xml.dvc')).toEqual(['git', 'add', 'data.xml.dvc']);
  });

  it('preserves spaces inside double quotes', () => {
    expect(tokenize('git commit -m "Initialize DVC repository"')).toEqual([
      'git',
      'commit',
      '-m',
      'Initialize DVC repository',
    ]);
  });

  it('preserves spaces inside single quotes', () => {
    expect(tokenize("dvc stage add -n train -c 'python train.py --lr 0.01'")).toEqual([
      'dvc',
      'stage',
      'add',
      '-n',
      'train',
      '-c',
      'python train.py --lr 0.01',
    ]);
  });

  it('handles multiple consecutive whitespace characters', () => {
    expect(tokenize('dvc   status   --all')).toEqual(['dvc', 'status', '--all']);
  });

  it('handles empty or whitespace only input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });

  it('handles empty quotes and escaped characters', () => {
    expect(tokenize('git commit -m ""')).toEqual(['git', 'commit', '-m', '']);
    expect(tokenize('echo "hello \\"world\\""')).toEqual(['echo', 'hello "world"']);
  });
});
