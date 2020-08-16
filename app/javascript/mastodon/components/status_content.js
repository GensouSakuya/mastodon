import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import { isRtl } from '../rtl';
import { FormattedMessage } from 'react-intl';
import Permalink from './permalink';
import classnames from 'classnames';
import PollContainer from 'mastodon/containers/poll_container';
import Icon from 'mastodon/components/icon';
import { autoPlayGif } from 'mastodon/initial_state';

const MAX_HEIGHT = 642; // 20px * 32 (+ 2px padding at the top)

export default class StatusContent extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    expanded: PropTypes.bool,
    showThread: PropTypes.bool,
    onExpandedToggle: PropTypes.func,
    onClick: PropTypes.func,
    collapsable: PropTypes.bool,
    onCollapsedToggle: PropTypes.func,
  };

  state = {
    hidden: true,
  };

  _updateStatusLinks () {
    const node = this.node;

    if (!node) {
      return;
    }

    const links = node.querySelectorAll('a');

    for (var i = 0; i < links.length; ++i) {
      let link = links[i];
      if (link.classList.contains('status-link')) {
        continue;
      }
      link.classList.add('status-link');

      let mention = this.props.status.get('mentions').find(item => link.href === item.get('url'));

      if (mention) {
        link.addEventListener('click', this.onMentionClick.bind(this, mention), false);
        link.setAttribute('title', mention.get('acct'));
      } else if (link.textContent[0] === '#' || (link.previousSibling && link.previousSibling.textContent && link.previousSibling.textContent[link.previousSibling.textContent.length - 1] === '#')) {
        link.addEventListener('click', this.onHashtagClick.bind(this, link.text), false);
      } else {
        link.setAttribute('title', link.href);
        link.classList.add('unhandled-link');
      }

      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }

    if (this.props.status.get('collapsed', null) === null) {
      let collapsed =
          this.props.collapsable
          && this.props.onClick
          && node.clientHeight > MAX_HEIGHT
          && this.props.status.get('spoiler_text').length === 0;

      if(this.props.onCollapsedToggle) this.props.onCollapsedToggle(collapsed);

      this.props.status.set('collapsed', collapsed);
    }
  }

  _updateStatusEmojis () {
    const node = this.node;

    if (!node || autoPlayGif) {
      return;
    }

    const emojis = node.querySelectorAll('.custom-emoji');

    for (var i = 0; i < emojis.length; i++) {
      let emoji = emojis[i];
      if (emoji.classList.contains('status-emoji')) {
        continue;
      }
      emoji.classList.add('status-emoji');

      emoji.addEventListener('mouseenter', this.handleEmojiMouseEnter, false);
      emoji.addEventListener('mouseleave', this.handleEmojiMouseLeave, false);
    }
  }

  componentDidMount () {
    this._updateStatusLinks();
    this._updateStatusEmojis();
  }

  componentDidUpdate () {
    this._updateStatusLinks();
    this._updateStatusEmojis();
  }

  onMentionClick = (mention, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/accounts/${mention.get('id')}`);
    }
  }

  onHashtagClick = (hashtag, e) => {
    hashtag = hashtag.replace(/^#/, '');

    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/timelines/tag/${hashtag}`);
    }
  }

  handleEmojiMouseEnter = ({ target }) => {
    target.src = target.getAttribute('data-original');
  }

  handleEmojiMouseLeave = ({ target }) => {
    target.src = target.getAttribute('data-static');
  }

  handleMouseDown = (e) => {
    this.startXY = [e.clientX, e.clientY];
  }

  handleMouseUp = (e) => {
    if (!this.startXY) {
      return;
    }

    const [ startX, startY ] = this.startXY;
    const [ deltaX, deltaY ] = [Math.abs(e.clientX - startX), Math.abs(e.clientY - startY)];

    let element = e.target;
    while (element) {
      if (element.localName === 'button' || element.localName === 'a' || element.localName === 'label') {
        return;
      }
      element = element.parentNode;
    }

    if (deltaX + deltaY < 5 && e.button === 0 && this.props.onClick) {
      this.props.onClick();
    }

    this.startXY = null;
  }

  handleSpoilerClick = (e) => {
    e.preventDefault();

    if (this.props.onExpandedToggle) {
      // The parent manages the state
      this.props.onExpandedToggle();
    } else {
      this.setState({ hidden: !this.state.hidden });
    }
  }

  setRef = (c) => {
    this.node = c;
  }
  
  textModify = (content) => {
    let tc = content;
    try {
      tc = setStrike(tc);
      tc = setBold(tc);
    }
    catch {
      //ignore
    }
    return tc;
  }

  setBold = (content) => {
    let tc = content;
    let matchedContent = tc.match(/\*\*(.)+\*\*/g);
    while(matchedContent!=null)
    {
      tc = tc.replace("**", "<b>");
      tc = tc.replace("**", "</b>");
      matchedContent = tc.match(/\*\*(.)+\*\*/g);
    }
    return tc;
  }
  
  setStrike = (content) => {
    let tc = content;
    let matchedContent = tc.match(/--(.)+--/g);
    while(matchedContent!=null)
    {
      tc = tc.replace("--", "<del>");
      tc = tc.replace("--", "</del>");
      matchedContent = tc.match(/--(.)+--/g);
    }
    return tc;
  }

  render () {
    const { status } = this.props;

    if (status.get('content').length === 0) {
      return null;
    }

    const hidden = this.props.onExpandedToggle ? !this.props.expanded : this.state.hidden;
    const renderReadMore = this.props.onClick && status.get('collapsed');
    const renderViewThread = this.props.showThread && status.get('in_reply_to_id') && status.get('in_reply_to_account_id') === status.getIn(['account', 'id']);

    const content = { __html: this.textModify(status.get('contentHtml')) };
    const spoilerContent = { __html: this.textModify(status.get('spoilerHtml')) };
    const directionStyle = { direction: 'ltr' };
    const classNames = classnames('status__content', {
      'status__content--with-action': this.props.onClick && this.context.router,
      'status__content--with-spoiler': status.get('spoiler_text').length > 0,
      'status__content--collapsed': renderReadMore,
    });

    if (isRtl(status.get('search_index'))) {
      directionStyle.direction = 'rtl';
    }

    const showThreadButton = (
      <button className='status__content__read-more-button' onClick={this.props.onClick}>
        <FormattedMessage id='status.show_thread' defaultMessage='Show thread' />
      </button>
    );

    const readMoreButton = (
      <button className='status__content__read-more-button' onClick={this.props.onClick} key='read-more'>
        <FormattedMessage id='status.read_more' defaultMessage='Read more' /><Icon id='angle-right' fixedWidth />
      </button>
    );
    
    if (status.get('spoiler_text').length > 0) {
      let mentionsPlaceholder = '';

      const mentionLinks = status.get('mentions').map(item => (
        <Permalink to={`/accounts/${item.get('id')}`} href={item.get('url')} key={item.get('id')} className='mention'>
          @<span>{item.get('username')}</span>
        </Permalink>
      )).reduce((aggregate, item) => [...aggregate, item, ' '], []);

      const toggleText = hidden ? <FormattedMessage id='status.show_more' defaultMessage='Show more' /> : <FormattedMessage id='status.show_less' defaultMessage='Show less' />;

      if (hidden) {
        mentionsPlaceholder = <div>{mentionLinks}</div>;
      }

      return (
        <div className={classNames} ref={this.setRef} tabIndex='0' style={directionStyle} onMouseDown={this.handleMouseDown} onMouseUp={this.handleMouseUp}>
          <p style={{ marginBottom: hidden && status.get('mentions').isEmpty() ? '0px' : null }}>
            <span dangerouslySetInnerHTML={spoilerContent} />
            {' '}
            <button tabIndex='0' className={`status__content__spoiler-link ${hidden ? 'status__content__spoiler-link--show-more' : 'status__content__spoiler-link--show-less'}`} onClick={this.handleSpoilerClick}>{toggleText}</button>
          </p>

          {mentionsPlaceholder}

          <div tabIndex={!hidden ? 0 : null} className={`status__content__text ${!hidden ? 'status__content__text--visible' : ''}`} style={directionStyle} dangerouslySetInnerHTML={content} />

          {!hidden && !!status.get('poll') && <PollContainer pollId={status.get('poll')} />}

          {renderViewThread && showThreadButton}
        </div>
      );
    } else if (this.props.onClick) {
      const output = [
        <div className={classNames} ref={this.setRef} tabIndex='0' style={directionStyle} onMouseDown={this.handleMouseDown} onMouseUp={this.handleMouseUp} key='status-content'>
          <div className='status__content__text status__content__text--visible' style={directionStyle} dangerouslySetInnerHTML={content} />

          {!!status.get('poll') && <PollContainer pollId={status.get('poll')} />}

          {renderViewThread && showThreadButton}
        </div>,
      ];

      if (renderReadMore) {
        output.push(readMoreButton);
      }

      return output;
    } else {
      return (
        <div className={classNames} ref={this.setRef} tabIndex='0' style={directionStyle}>
          <div className='status__content__text status__content__text--visible' style={directionStyle} dangerouslySetInnerHTML={content} />

          {!!status.get('poll') && <PollContainer pollId={status.get('poll')} />}

          {renderViewThread && showThreadButton}
        </div>
      );
    }
  }

}
