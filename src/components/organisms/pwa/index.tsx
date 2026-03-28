import React from "react";

function IoIosShare(props) {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth={0}
      viewBox="0 0 512 512"
      height="1em"
      width="1em"
      {...props}
    >
      <path d="M376 176H269v146.6c0 7-5.4 13-12.4 13.4-7.5.4-13.6-5.6-13.6-13V176H136c-22 0-40 18-40 40v208c0 22 18 40 40 40h240c22 0 40-18 40-40V216c0-22-18-40-40-40zM269 92.1l47.9 47.2c5.1 5 13.3 5 18.4-.1 5-5.1 5-13.3-.1-18.4l-70-69c-2.5-2.4-5.8-3.7-9.1-3.7-1.7 0-3.4.3-5 1-1.5.6-2.9 1.6-4.1 2.7l-70 69c-5.1 5-5.2 13.3-.1 18.4 5 5.1 13.3 5.2 18.4.1L243 92.1V176h26V92.1z" />
    </svg>
  );
}

function RiAddBoxFill(props) {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth={0}
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      {...props}
    >
      <g>
        <path fill="none" d="M0 0h24v24H0z" />
        <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 8H7v2h4v4h2v-4h4v-2h-4V7h-2v4z" />
      </g>
    </svg>
  );
}

function GrFormNextLink(props) {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth={0}
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      {...props}
    >
      <path
        fill="none"
        stroke="#000"
        strokeWidth={2}
        d="M6,12.4 L18,12.4 M12.6,7 L18,12.4 L12.6,17.8"
      />
    </svg>
  );
}

function BsThreeDotsVertical() {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth={0}
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
    >
      <path
        fillRule="evenodd"
        d="M9.5 13a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0-5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0-5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PWAPrompt({ showPrompt, type, promptEvent, handlePromptClose }) {
  return (
    <div className="confirmation-modal-wrap">
      {/* <Backdrop
        className="backdrop-modal-wrapper install-pwa-modal-wrap"
        open={showPrompt ? true : false}
        onClick={() => handlePromptClose(false)}
      >
        <div
          className="backdrop-modal-content "
          style={{ height: showPrompt ? "230px" : "0px" }}
        >
          <div className="heading">Install</div>
          <div className="modal-close" onClick={() => handlePromptClose(false)}>
            <SvgIcon icon="closeLarge" />
          </div>
          <div className="member-modal">
            <div className="body-text">
              Installing uses almost no storage and provides a quick way to
              return to this app
            </div>
            {promptEvent ? (
              <div className="form-btn-wrap">
                <button
                  className="primary-btn"
                  onClick={() => handlePromptClose(true)}
                >
                  Install
                </button>
              </div>
            ) : (
              <>
                <div className="ios-note">
                  To download app tap the Menu button and then{" "}
                  <span>'Add to Home screen'</span> button
                </div>
                <div className="install-text-ios">
                  {type == "IOS" ? (
                    <div className="icon">
                      <IoIosShare />
                    </div>
                  ) : (
                    <div className="icon">
                      <BsThreeDotsVertical />
                    </div>
                  )}
                  <div className="icon">
                    <GrFormNextLink />
                  </div>
                  <div className="icon">
                    <RiAddBoxFill />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Backdrop> */}
    </div>
  );
}

export default PWAPrompt;
