import { useForumStore } from '../store/forumStore';

describe('forumStore', () => {
  beforeEach(() => {
    useForumStore.setState({ votedPolls: {} });
  });

  describe('votePoll', () => {
    it('stores voted option index for a post', () => {
      useForumStore.getState().votePoll('post-1', 0);
      expect(useForumStore.getState().votedPolls['post-1']).toBe(0);
    });

    it('overwrites existing vote when voting another option', () => {
      useForumStore.getState().votePoll('post-1', 0);
      useForumStore.getState().votePoll('post-1', 1);
      expect(useForumStore.getState().votedPolls['post-1']).toBe(1);
    });

    it('clears all voted polls', () => {
      useForumStore.getState().votePoll('post-1', 0);
      useForumStore.getState().votePoll('post-2', 1);
      useForumStore.getState().clearVotedPolls();
      expect(Object.keys(useForumStore.getState().votedPolls).length).toBe(0);
    });
  });
});
