/* global pageVueRenderFn:readonly, pageVueStaticRenderFns:readonly */
// pageVueRenderFn and pageVueStaticRenderFns exist in dynamically generated script by Page/index.js

// eslint-disable-next-line import/no-extraneous-dependencies
import vueCommonAppFactory from './VueCommonAppFactory';
import initScrollTopButton from './scrollTopButton';
import './styles/index.css';

const { MarkBindVue, appFactory } = vueCommonAppFactory;

Vue.use(MarkBindVue.plugin);

function scrollToUrlAnchorHeading() {
  if (window.location.hash) {
    // remove leading hash to get element ID
    const headingElement = document.getElementById(window.location.hash.slice(1));
    if (headingElement) {
      headingElement.scrollIntoView();
      window.scrollBy(0, -document.body.style.paddingTop.replace('px', ''));
    }
  }
}

function detectAndApplyFixedHeaderStyles() {
  jQuery(':header').each((index, heading) => {
    if (heading.id) {
      jQuery(heading).removeAttr('id'); // to avoid duplicated id problem
    }
  });

  const headerSelector = jQuery('header[fixed]');
  const isFixed = headerSelector.length !== 0;
  if (!isFixed) {
    return;
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 767 && headerSelector.hasClass('hide-header')) {
      headerSelector.removeClass('hide-header');
      headerSelector.css('overflow', '');
    }
  });

  const updateHeaderHeight = () => {
    const newHeaderHeight = headerSelector.height();
    document.documentElement.style.setProperty('--header-height', `${newHeaderHeight}px`);
  };

  const toggleHeaderOverflow = () => {
    const headerMaxHeight = headerSelector.css('max-height');
    // reset overflow when header shows again to allow content
    // in the header such as search dropdown etc. to overflow
    if (headerMaxHeight === '100%') {
      headerSelector.css('overflow', '');
      updateHeaderHeight();
    }
  };

  let lastOffset = 0;
  let lastHash = window.location.hash;
  const toggleHeaderOnScroll = () => {
    // prevent toggling of header on desktop site
    if (window.innerWidth > 767) { return; }

    if (lastHash !== window.location.hash) {
      lastHash = window.location.hash;
      headerSelector.removeClass('hide-header');
      return;
    }
    lastHash = window.location.hash;

    const currentOffset = window.pageYOffset;
    const isEndOfPage = (window.innerHeight + currentOffset) >= document.body.offsetHeight;
    // to prevent page from auto scrolling when header is toggled at the end of page
    if (isEndOfPage) { return; }

    if (currentOffset > lastOffset) {
      const headerEnd = headerSelector.height() + headerSelector[0].getBoundingClientRect().top;
      const isBeforeHeader = currentOffset < headerEnd;
      if (isBeforeHeader) {
        return;
      }

      headerSelector.addClass('hide-header');
    } else {
      headerSelector.removeClass('hide-header');
    }
    lastOffset = currentOffset;
  };

  const resizeObserver = new ResizeObserver(() => {
    const headerMaxHeight = headerSelector.css('max-height');
    // hide header overflow when user scrolls to support transition effect
    if (headerMaxHeight !== '100%') {
      headerSelector.css('overflow', 'hidden');
      return;
    }
    updateHeaderHeight();
  });
  resizeObserver.observe(headerSelector[0]);
  headerSelector[0].addEventListener('transitionend', toggleHeaderOverflow);

  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(toggleHeaderOnScroll, 20);
  });
}

function updateSearchData(vm) {
  jQuery.getJSON(`${baseUrl}/siteData.json`)
    .then((siteData) => {
      vm.searchData = siteData.pages;
    });
}

/*
 * Changes every <script src defer type="application/javascript" style-bypass-vue-compilation>
 * placeholder tags that was used to bypass Vue compilation back into original intended <style> tags.
 */
function restoreStyleTags() {
  const tagsToRestore = document.querySelectorAll('script[style-bypass-vue-compilation]');
  tagsToRestore.forEach((oldScriptTag) => {
    const restoredStyleTag = document.createElement('style');
    restoredStyleTag.innerHTML = oldScriptTag.innerHTML;
    oldScriptTag.parentNode.replaceChild(restoredStyleTag, oldScriptTag);
  });
}

function executeAfterMountedRoutines() {
  restoreStyleTags();
  scrollToUrlAnchorHeading();
  detectAndApplyFixedHeaderStyles();
}

window.handleSiteNavClick = function (elem, useAnchor = true) {
  if (useAnchor) {
    const anchorElements = elem.getElementsByTagName('a');
    if (anchorElements.length) {
      window.location.href = anchorElements[0].href;
      return;
    }
  }
  const dropdownContent = elem.nextElementSibling;
  const dropdownIcon = elem.lastElementChild;
  dropdownContent.classList.toggle('site-nav-dropdown-container-open');
  dropdownIcon.classList.toggle('site-nav-rotate-icon');
};

function setup() {
  const vm = new Vue({
    render(createElement) {
      return pageVueRenderFn.call(this, createElement);
    },
    staticRenderFns: pageVueStaticRenderFns,
    ...appFactory(),
    mounted() {
      executeAfterMountedRoutines();
    },
  });
  /*
   * For SSR, if we mount onto the wrong element (without data-server-rendered attribute) in our SSR setup,
   * hydration will fail silently and turn into client-side rendering, which is not what we want.
   * Thus, we will always force hydration so that we always know when hydration has failed, so that we can
   * address the hydration issue accordingly.
   */
  vm.$mount('#app', true); // second parameter, 'true', enables force hydration
}

function setupWithSearch() {
  const vm = new Vue({
    render(createElement) {
      return pageVueRenderFn.call(this, createElement);
    },
    staticRenderFns: pageVueStaticRenderFns,
    ...appFactory(),
    mounted() {
      executeAfterMountedRoutines();
      updateSearchData(this);
    },
  });
  /*
   * For SSR, if we mount onto the wrong element (without data-server-rendered attribute) in our SSR setup,
   * hydration will fail silently and turn into client-side rendering, which is not what we want.
   * Thus, we will always force hydration so that we always know when hydration has failed, so that we can
   * address the hydration issue accordingly.
   */
  vm.$mount('#app', true); // second parameter, 'true', enables force hydration
}

initScrollTopButton();

export default { setup, setupWithSearch };
