import { useForumStore } from '../store/forumStore';

describe('forumStore', () => {
  beforeEach(() => {
    useForumStore.setState({ votedPolls: new Map() });
  });

  describe('votePoll', () => {
    it('stores voted option index for a post', () => {
      useForumStore.getState().votePoll('post-1', 0);
      expect(useForumStore.getState().votedPolls.get('post-1')).toBe(0);
    });

    it('does not overwrite existing vote', () => {
      useForumStore.getState().votePoll('post-1', 0);
      useForumStore.getState().votePoll('post-1', 1);
      expect(useForumStore.getState().votedPolls.get('post-1')).toBe(0);
    });
  });
});
